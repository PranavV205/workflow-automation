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
        const start = parseInt(req.query.start) || 0
        const end = parseInt(req.query.end) || 19

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
        const failedJobs = await webhookQueue.getFailed(0, -1)

        let replayed = 0
        for (const job of failedJobs) {
            await job.retry()
            replayed++
        }

        log.info('admin.replay_failed', { replayed })
        res.json({ replayed })
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
