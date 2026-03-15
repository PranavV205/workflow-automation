const workflowState = require('./workflowState')
const STEPS = require('./workflowSteps')

const runWorkflow = async (jobData) => {
    const { workflowId } = jobData

    console.log(`\n[workflow] Starting — id: ${workflowId}`)

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

            console.error(`[workflow] ✗ Step "${step.name}" failed: ${error.message}`)

            throw error
        }
    }

    const finalState = await workflowState.get(workflowId)
    console.log(`[workflow] ✓ Completed — id: ${workflowId} status: ${finalState.status}\n`)

    return finalState
}

module.exports = { runWorkflow }
