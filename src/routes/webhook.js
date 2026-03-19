const express = require('express')
const router = express.Router()

const verifyGithubSignature = require('../middleware/verifyGithubSignature')
const extractEventData = require('../middleware/extractEventData')
const { webhookQueue } = require('../queue/webhookQueue')
const workflowState = require('../workflow/workflowState')
const log = require('../utils/logger')

router.post('/',
    verifyGithubSignature,
    extractEventData,
    async (req, res, next) => {
        try {
            const { type, deliveryId, payload } = req.githubEvent

            const workflowId = `workflow:${deliveryId}`

            const created = await workflowState.create(workflowId, {
                deliveryId,
                eventType: type,
                repo: payload.repository?.full_name ?? 'unknown',
            })

            if (!created) {
                log.info('webhook.duplicate', { deliveryId, workflowId })
                return res.status(200).json({
                    workflowId,
                    status: 'duplicate; already processing',
                })
            }

            await webhookQueue.add(type, {
                type,
                deliveryId,
                workflowId,
                payload,
                receivedAt: new Date().toISOString(),
            }, {
                jobId: deliveryId,
            })

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
