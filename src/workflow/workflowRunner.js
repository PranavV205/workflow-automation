const workflowState = require('./workflowState')
const STEPS = require('./workflowSteps')
const log = require('../utils/logger')

const runWorkflow = async (jobData) => {
    const { workflowId, deliveryId } = jobData

    log.info('workflow.started', { workflowId, deliveryId })

    const context = { ...jobData }

    for (const step of STEPS) {
        const stepStart = Date.now()

        log.info('workflow.step_started', {
            workflowId,
            deliveryId,
            step: step.name,
        })

        await workflowState.update(workflowId, step.name, {
            status: 'running',
            startedAt: new Date().toISOString()
        })

        try {
            const output = await step.fn(context)

            context[step.name] = output

            const duration_ms = Date.now() - stepStart

            await workflowState.update(workflowId, step.name, {
                status: 'completed',
                completedAt: new Date().toISOString(),
                output
            })

            log.info('workflow.step_completed', {
                workflowId,
                deliveryId,
                step: step.name,
                duration_ms,
            })
        } catch (error) {
            const duration_ms = Date.now() - stepStart

            await workflowState.update(workflowId, step.name, {
                status: 'failed',
                failedAt: new Date().toISOString(),
                duration_ms,
                error: error.message
            })

            log.error('workflow.step_failed', {
                workflowId,
                deliveryId,
                step: step.name,
                duration_ms,
                error: error.message,
                stack: error.stack,
            })

            throw error
        }
    }

    const finalState = await workflowState.get(workflowId)
    log.info('workflow.completed', {
        workflowId,
        deliveryId,
        status: finalState.status,
    })

    return finalState
}

module.exports = { runWorkflow }
