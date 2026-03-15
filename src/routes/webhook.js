const express = require('express')
const router = express.Router()

const verifyGithubSignature = require('../middleware/verifyGithubSignature')
const extractEventData = require('../middleware/extractEventData')
const { webhookQueue } = require('../queue/webhookQueue')
const workflowState = require('../workflow/workflowState')

router.post('/',
    verifyGithubSignature,
    extractEventData,
    async (req, res, next) => {
        try {
            const { type, deliveryId, payload } = req.githubEvent

            const workflowId = `workflow:${deliveryId}`

            await workflowState.create(workflowId, {
                deliveryId,
                eventType: type,
                repo: payload.repository?.full_name ?? 'unknown',
            })

            await webhookQueue.add(type, {
                type,
                deliveryId,
                workflowId,
                payload,
                receivedAt: new Date().toISOString(),
            }, {
                jobId: deliveryId,
            })

            console.log(`[webhook] Enqueued — event: ${type}, workflowId: ${workflowId}`)

            res.status(200).json({ workflowId })
        } catch (error) {
            next(error)
        }
    }
)

module.exports = router
