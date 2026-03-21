const connection = require('../redis/redis')
const log = require('../utils/logger')
const STEPS = require('./workflowSteps')

const toWorkflowId = (deliveryId) => `workflow:${deliveryId}`
const indexKey = (deliveryId) => `workflow-by-delivery:${deliveryId}`

const create = async (deliveryId, initialData) => {
    const workflowId = toWorkflowId(deliveryId)

    const workflow = {
        ...initialData,
        workflowId,
        deliveryId,
        status: 'running',
        createdAt: new Date().toISOString(),
        steps: Object.fromEntries(STEPS.map(s => [s.name, { status: 'pending' }])),
    }

    const created = await connection.set(workflowId, JSON.stringify(workflow), 'EX', 86400 * 3, 'NX')  // 3 days

    if (!created) {
        log.info('workflow.create_skipped', {
            workflowId,
            reason: 'Already exists — duplicate delivery',
        })
        return null
    }

    await connection.set(indexKey(deliveryId), workflowId, 'EX', 86400 * 3)

    return workflow
}

const update = async (workflowId, stepName, stepData) => {
    const raw = await connection.get(workflowId)
    if (!raw) throw new Error(`Workflow not found: ${workflowId}`)

    const workflow = JSON.parse(raw)

    workflow.steps[stepName] = {
        ...workflow.steps[stepName],
        ...stepData,
        updatedAt: new Date().toISOString()
    }

    const statuses = Object.values(workflow.steps).map(s => s.status)
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
