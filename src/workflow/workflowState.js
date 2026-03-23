const connection = require('../redis/redis')
const log = require('../utils/logger')

const toWorkflowId = (deliveryId) => `workflow:${deliveryId}`
const indexKey = (deliveryId) => `workflow-by-delivery:${deliveryId}`

const create = async (deliveryId, initialData, definition) => {
    const workflowId = toWorkflowId(deliveryId)

    const nodeEntries = definition.nodes.map(n => [n.id, { status: 'pending' }])

    const workflow = {
        ...initialData,
        workflowId,
        deliveryId,
        workflowDefinition: definition.id,
        status: 'running',
        createdAt: new Date().toISOString(),
        nodes: Object.fromEntries(nodeEntries),
    }

    const created = await connection.set(
        workflowId, JSON.stringify(workflow), 'EX', 86400 * 3, 'NX'
    )

    if (!created) {
        log.info('workflow.create_skipped', {
            workflowId,
            reason: 'Already exists, duplicate delivery',
        })
        return null
    }

    await connection.set(indexKey(deliveryId), workflowId, 'EX', 86400 * 3)

    return workflow
}

const ATOMIC_UPDATE_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then
    return nil
end

local workflow = cjson.decode(raw)
local nodeId = ARGV[1]
local nodeData = cjson.decode(ARGV[2])
local now = ARGV[3]

if not workflow.nodes then
    workflow.nodes = {}
end
if not workflow.nodes[nodeId] then
    workflow.nodes[nodeId] = {}
end

for k, v in pairs(nodeData) do
    workflow.nodes[nodeId][k] = v
end
workflow.nodes[nodeId]['updatedAt'] = now

local hasFailed = false
local allDone = true
for _, node in pairs(workflow.nodes) do
    if node.status == 'failed' then
        hasFailed = true
    end
    if node.status ~= 'completed' and node.status ~= 'skipped' then
        allDone = false
    end
end

if hasFailed then
    workflow.status = 'failed'
elseif allDone then
    workflow.status = 'completed'
    workflow.completedAt = now
else
    workflow.status = 'running'
end

local encoded = cjson.encode(workflow)
redis.call('SET', KEYS[1], encoded, 'KEEPTTL')
return encoded
`

const update = async (workflowId, nodeId, nodeData) => {
    const result = await connection.eval(
        ATOMIC_UPDATE_SCRIPT,
        1,
        workflowId,
        nodeId,
        JSON.stringify(nodeData),
        new Date().toISOString()
    )

    if (!result) throw new Error(`Workflow not found: ${workflowId}`)
    return JSON.parse(result)
}

const get = async (workflowId) => {
    const raw = await connection.get(workflowId)
    return raw ? JSON.parse(raw) : null
}

const getByDelivery = async (deliveryId) => {
    const workflowId = await connection.get(indexKey(deliveryId))
    if (!workflowId) return null
    return get(workflowId)
}

const del = async (workflowId, deliveryId) => {
    await connection.del(workflowId, indexKey(deliveryId))
}

module.exports = { create, update, get, getByDelivery, del }
