const workflowState = require('./workflowState')
const STEPS = require('./workflowSteps')

const runWorkflow = async (jobData) => {
    const { workflowId, deliveryId } = jobData

    console.log(`\n[workflow] Starting — workflowId=${workflowId} deliveryId=${deliveryId}`)

    const context = { ...jobData }

    for (const step of STEPS) {
        console.log(`[workflow] → Step: ${step.name}`)

        await workflowState.update(workflowId, step.name, {
            status: 'running',
            startedAt: new Date().toISOString()
        })

        try {
            const output = await step.fn(context)

            context[step.name] = output

            await workflowState.update(workflowId, step.name, {
                status: 'completed',
                completedAt: new Date().toISOString(),
                output
            })
        } catch (error) {
            await workflowState.update(workflowId, step.name, {
                status: 'failed',
                failedAt: new Date().toISOString(),
                error: error.message
            })

            console.error(
                `[workflow] ✗ Step failed — step=${step.name} workflowId=${workflowId} deliveryId=${deliveryId} error=${error.message}`
            )

            throw error
        }
    }

    const finalState = await workflowState.get(workflowId)
    console.log(
        `[workflow] ✓ Completed — workflowId=${workflowId} deliveryId=${deliveryId} status=${finalState.status}\n`
    )

    return finalState
}

module.exports = { runWorkflow }
