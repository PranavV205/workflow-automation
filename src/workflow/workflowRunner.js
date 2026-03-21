const workflowState = require('./workflowState')
const { getHandler } = require('./nodeHandlers')
const { resolveExecutionOrder } = require('./graphEngine')
const log = require('../utils/logger')

const runWorkflow = async (jobData, definition) => {
    const { workflowId, deliveryId } = jobData

    log.info('workflow.started', {
        workflowId,
        deliveryId,
        workflowDef: definition.id,
    })

    const executionOrder = resolveExecutionOrder(definition)

    const nodeMap = new Map(definition.nodes.map(n => [n.id, n]))

    const context = { ...jobData }

    for (const nodeId of executionOrder) {
        const node = nodeMap.get(nodeId)
        const handler = getHandler(node.type)
        const stepStart = Date.now()

        log.info('workflow.node_started', {
            workflowId,
            deliveryId,
            nodeId: node.id,
            nodeType: node.type,
        })

        await workflowState.update(workflowId, node.id, {
            status: 'running',
            startedAt: new Date().toISOString(),
        })

        try {
            const output = await handler(context)

            context[node.type] = output

            const duration_ms = Date.now() - stepStart

            await workflowState.update(workflowId, node.id, {
                status: 'completed',
                completedAt: new Date().toISOString(),
                output,
            })

            log.info('workflow.node_completed', {
                workflowId,
                deliveryId,
                nodeId: node.id,
                nodeType: node.type,
                duration_ms,
            })
        } catch (error) {
            const duration_ms = Date.now() - stepStart

            await workflowState.update(workflowId, node.id, {
                status: 'failed',
                failedAt: new Date().toISOString(),
                duration_ms,
                error: error.message,
            })

            log.error('workflow.node_failed', {
                workflowId,
                deliveryId,
                nodeId: node.id,
                nodeType: node.type,
                duration_ms,
                error: error.message,
                stack: error.stack,
            })

            throw error
        }
    }

    const finalState = await workflowState.get(workflowId)

    if (!finalState) {
        log.warn('workflow.state_expired', {
            workflowId,
            deliveryId,
            message: 'Workflow state not found in Redis; key may have expired',
        })
        return { workflowId, status: 'unknown', expired: true }
    }

    log.info('workflow.completed', {
        workflowId,
        deliveryId,
        status: finalState.status,
    })

    return finalState
}

module.exports = { runWorkflow }
