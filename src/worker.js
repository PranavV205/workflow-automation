require('dotenv').config()

const { Worker, QueueEvents } = require('bullmq')
const connection = require('./redis/redis')
const handlePush = require('./handlers/push')
const handlePullRequest = require('./handlers/pullRequest')

const handlers = {
    'push': handlePush,
    'pull_request': handlePullRequest
}

const worker = new Worker('webhook-events', async (job) => {
    console.log(`[worker] Picked up job — name: ${job.name}, id: ${job.id}, attempt: ${job.attemptsMade + 1}`)

    const handler = handlers[job.name]

    if (typeof handler !== 'function') {
        const handlerType = handler === undefined ? 'undefined' : typeof handler
        console.warn(`[worker] No valid handler for event type: "${job.name}" (resolved type: ${handlerType}) — skipping`)
        return
    }

    await handler(job.data)

    console.log(`[worker] Completed job — name: ${job.name}, id: ${job.id}`)
}, {
    connection,
    concurrency: 5
})

const queueEvents = new QueueEvents('webhook-events', { connection })

queueEvents.on('completed', ({ jobId }) => {
    console.log(`[queueEvents] ✓ Job completed — id: ${jobId}`)
})

queueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`[queueEvents] ✗ Job failed — id: ${jobId}, reason: ${failedReason}`)
})

queueEvents.on('retries-exhausted', ({ jobId, failedReason }) => {
    console.error(`[queueEvents] ✗✗ Retries exhausted — id: ${jobId}, reason: ${failedReason}`)
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