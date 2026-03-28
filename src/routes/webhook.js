const path = require('path')
const express = require('express')
const router = express.Router()

const verifyGithubSignature = require('../middleware/verifyGithubSignature')
const extractEventData = require('../middleware/extractEventData')
const { webhookQueue } = require('../queue/webhookQueue')
const workflowState = require('../workflow/workflowState')
const { loadWorkflow } = require('../workflow/workflowLoader')
const log = require('../utils/logger')

const definition = loadWorkflow(
    path.join(__dirname, '..', '..', 'workflows', 'gmail-notify.json')
)

router.post('/',
    verifyGithubSignature,
    extractEventData,
    async (req, res, next) => {
        try {
            const { type, deliveryId, payload } = req.githubEvent

            const workflow = await workflowState.create(deliveryId, {
                eventType: type,
                repo: payload.repository?.full_name ?? 'unknown',
            }, definition)

            if (!workflow) {
                log.info('webhook.duplicate', { deliveryId })
                return res.status(200).json({
                    deliveryId,
                    status: 'duplicate; already processing',
                })
            }

            const { workflowId } = workflow

            try {
                await webhookQueue.add(type, {
                    type,
                    deliveryId,
                    workflowId,
                    payload,
                    receivedAt: new Date().toISOString(),
                }, {
                    jobId: deliveryId,
                })
            } catch (enqueueError) {
                log.error('webhook.enqueue_failed', {
                    deliveryId,
                    workflowId,
                    error: enqueueError.message,
                })
                await workflowState.del(workflowId, deliveryId)
                throw enqueueError
            }

            log.info('webhook.enqueued', {
                event: type,
                deliveryId,
                workflowId,
            })

            res.status(200).json({ workflowId })
        } catch (error) {
            next(error)
        }
    }
)

module.exports = router
