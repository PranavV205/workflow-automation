const express = require('express')
const router = express.Router()
const { webhookQueue } = require('../queue/webhookQueue')
const log = require('../utils/logger')

router.get('/queue/health', async (req, res, next) => {
    try {
        const counts = await webhookQueue.getJobCounts(
            'waiting', 'active', 'completed', 'failed', 'delayed', 'stalled'
        )
        res.json({ queue: 'webhook-events', counts })
    } catch (err) {
        next(err)
    }
})

router.get('/queue/failed', async (req, res, next) => {
    try {
        const parsedStart = parseInt(req.query.start)
        const parsedEnd = parseInt(req.query.end)
        const start = Number.isNaN(parsedStart) ? 0 : parsedStart
        const end = Number.isNaN(parsedEnd) ? 19 : parsedEnd

        const failedJobs = await webhookQueue.getFailed(start, end)

        const jobs = failedJobs.map(job => ({
            id: job.id,
            name: job.name,
            deliveryId: job.data?.deliveryId,
            workflowId: job.data?.workflowId,
            attemptsMade: job.attemptsMade,
            failedReason: job.failedReason,
            timestamp: job.timestamp,
            finishedOn: job.finishedOn,
        }))

        res.json({ count: jobs.length, jobs })
    } catch (err) {
        next(err)
    }
})

router.post('/queue/replay-failed', async (req, res, next) => {
    try {
        const parsedLimit = parseInt(req.query.limit)
        const limit = Number.isNaN(parsedLimit) ? 100 : Math.min(parsedLimit, 1000)
        const failedJobs = await webhookQueue.getFailed(0, limit - 1)

        let replayed = 0
        for (const job of failedJobs) {
            await job.retry()
            replayed++
        }

        log.info('admin.replay_failed', { replayed, limit })
        res.json({ replayed, limit })
    } catch (err) {
        next(err)
    }
})

router.post('/queue/replay/:jobId', async (req, res, next) => {
    try {
        const job = await webhookQueue.getJob(req.params.jobId)
        if (!job) return res.status(404).json({ error: 'Job not found' })

        const state = await job.getState()
        if (state !== 'failed') {
            return res.status(400).json({ error: `Job is in "${state}" state, not failed` })
        }

        await job.retry()
        log.info('admin.replay_single', { jobId: job.id })
        res.json({ replayed: true, jobId: job.id })
    } catch (err) {
        next(err)
    }
})

module.exports = router
