const workflowState = require('./workflowState')
const { getHandler } = require('./nodeHandlers')
const { resolveExecutionLevels, getDownstreamNodes } = require('./graphEngine')
const { ensureFreshToken } = require('../middleware/tokenRefresh')
const log = require('../utils/logger')

const executeNode = async (nodeId, nodeMap, context, workflowId, deliveryId) => {
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
        let nodeContext = context
        if (node.credentials) {
            const { provider = 'google', userId = 'default' } = node.credentials
            const accessToken = await ensureFreshToken(userId, provider)
            nodeContext = {
                ...context,
                credentials: {
                    ...context.credentials,
                    [provider]: { accessToken },
                },
            }
        }

        const output = await handler(nodeContext)
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

        return output
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

const runWorkflow = async (jobData, definition) => {
    const { workflowId, deliveryId } = jobData

    log.info('workflow.started', {
        workflowId,
        deliveryId,
        workflowDef: definition.id,
    })

    const levels = resolveExecutionLevels(definition)
    const nodeMap = new Map(definition.nodes.map(n => [n.id, n]))
    const context = { ...jobData }

    log.info('workflow.execution_plan', {
        workflowId,
        deliveryId,
        levels: levels.map((nodes, i) => ({
            level: i,
            nodes,
            parallel: nodes.length > 1,
        })),
    })

    for (const [levelIndex, level] of levels.entries()) {
        if (level.length > 1) {
            log.info('workflow.parallel_level', {
                workflowId,
                deliveryId,
                level: levelIndex,
                nodes: level,
                count: level.length,
            })
        }

        const results = await Promise.allSettled(
            level.map(nodeId =>
                executeNode(nodeId, nodeMap, context, workflowId, deliveryId)
            )
        )

        const failures = []
        for (let i = 0; i < results.length; i++) {
            const result = results[i]
            const nodeId = level[i]
            const node = nodeMap.get(nodeId)

            if (result.status === 'fulfilled') {
                context[node.type] = result.value
                context[`node:${node.id}`] = result.value
            } else {
                failures.push({ nodeId, error: result.reason })
            }
        }

        if (failures.length > 0) {
            const failedIds = failures.map(f => f.nodeId)

            // Mark every node downstream of the failure(s) as skipped
            const downstream = getDownstreamNodes(failedIds, definition)
            for (const skipId of downstream) {
                await workflowState.update(workflowId, skipId, {
                    status: 'skipped',
                    reason: `Upstream node(s) failed: ${failedIds.join(', ')}`,
                    skippedAt: new Date().toISOString(),
                })
            }

            log.error('workflow.level_failed', {
                workflowId,
                deliveryId,
                level: levelIndex,
                failedNodes: failedIds,
                skippedNodes: [...downstream],
            })

            throw failures[0].error
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
