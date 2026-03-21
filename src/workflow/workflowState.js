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

const update = async (workflowId, nodeId, nodeData) => {
    const raw = await connection.get(workflowId)
    if (!raw) throw new Error(`Workflow not found: ${workflowId}`)

    const workflow = JSON.parse(raw)

    workflow.nodes[nodeId] = {
        ...workflow.nodes[nodeId],
        ...nodeData,
        updatedAt: new Date().toISOString(),
    }

    const statuses = Object.values(workflow.nodes).map(n => n.status)
    if (statuses.some(s => s === 'failed')) workflow.status = 'failed'
    else if (statuses.every(s => s === 'completed')) workflow.status = 'completed'
    else workflow.status = 'running'

    if (workflow.status === 'completed') {
        workflow.completedAt = new Date().toISOString()
    }

    await connection.set(workflowId, JSON.stringify(workflow), 'KEEPTTL')
    return workflow
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
