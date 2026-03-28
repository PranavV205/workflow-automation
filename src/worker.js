require('dotenv').config()

const path = require('path')
const { Worker, QueueEvents } = require('bullmq')
const connection = require('./redis/redis')
const { runWorkflow } = require('./workflow/workflowRunner')
const { loadWorkflow } = require('./workflow/workflowLoader')
const { webhookQueue } = require('./queue/webhookQueue')
const log = require('./utils/logger')

const definition = loadWorkflow(
    path.join(__dirname, '..', 'workflows', 'gmail-notify.json')
)
log.info('worker.workflow_loaded', {
    id: definition.id,
    name: definition.name,
    nodeCount: definition.nodes.length,
    edgeCount: definition.edges.length,
})

const worker = new Worker('webhook-events', async (job) => {
    const { workflowId, deliveryId } = job.data

    log.info('worker.picked_up', {
        event: job.name,
        jobId: job.id,
        deliveryId,
        workflowId,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
    })

    await runWorkflow(job.data, definition)

    log.info('worker.finished', {
        event: job.name,
        jobId: job.id,
        deliveryId,
        workflowId,
    })
}, {
    connection,
    concurrency: 5,
    stalledInterval: 30_000,
    maxStalledCount: 2,
})

const queueEvents = new QueueEvents('webhook-events', { connection })

queueEvents.on('completed', ({ jobId }) => {
    log.info('job.completed', { jobId })
})

queueEvents.on('failed', ({ jobId, failedReason }) => {
    log.error('job.failed', { jobId, reason: failedReason })
})

queueEvents.on('retries-exhausted', ({ jobId, failedReason }) => {
    log.error('job.retries_exhausted', {
        jobId,
        reason: failedReason,
        action: 'JOB_IN_DLQ: needs manual inspection or replay',
    })
})

queueEvents.on('stalled', ({ jobId }) => {
    log.warn('job.stalled', {
        jobId,
        message: 'Worker stopped heartbeating; job returned to waiting queue',
    })
})

const HEALTH_CHECK_INTERVAL = 60_000
const healthCheckInterval = setInterval(async () => {
    try {
        const counts = await webhookQueue.getJobCounts(
            'waiting', 'active', 'completed', 'failed', 'delayed', 'stalled'
        )
        log.info('queue.health', counts)
    } catch (err) {
        log.error('queue.health_check_failed', { error: err.message })
    }
}, HEALTH_CHECK_INTERVAL)

const shutdown = async (signal) => {
    console.log(`[worker] ${signal} received, shutting down gracefully`)
    clearInterval(healthCheckInterval)
    await worker.close()
    await queueEvents.close()
    console.log('[worker] All in-flight jobs finished, exiting')
    process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

console.log('[worker] Started, waiting for jobs (concurrency: 5)')
