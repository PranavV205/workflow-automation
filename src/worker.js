require('dotenv').config()

const { Worker, QueueEvents } = require('bullmq')
const connection = require('./redis/redis')
const { runWorkflow } = require('./workflow/workflowRunner')

const worker = new Worker('webhook-events', async (job) => {
    const { workflowId, deliveryId } = job.data
    console.log(
        `[worker] Picked up — event=${job.name} jobId=${job.id} deliveryId=${deliveryId} workflowId=${workflowId} attempt=${job.attemptsMade + 1}`
    )

    await runWorkflow(job.data)

    console.log(
        `[worker] Finished — event=${job.name} jobId=${job.id} deliveryId=${deliveryId} workflowId=${workflowId}`
    )
}, {
    connection,
    concurrency: 5,
})

const queueEvents = new QueueEvents('webhook-events', { connection })

queueEvents.on('completed', ({ jobId }) => {
    console.log(`[queueEvents] ✓ Job completed — jobId=${jobId}`)
})

queueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`[queueEvents] ✗ Job failed — jobId=${jobId} reason=${failedReason}`)
})

queueEvents.on('retries-exhausted', ({ jobId, failedReason }) => {
    console.error(`[queueEvents] ✗✗ Retries exhausted — jobId=${jobId} reason=${failedReason}`)
})

const shutdown = async (signal) => {
    console.log(`[worker] ${signal} received — shutting down gracefully`)
    await worker.close()
    console.log('[worker] All in-flight jobs finished — exiting')
    process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

console.log('[worker] Started — waiting for jobs (concurrency: 5)')
