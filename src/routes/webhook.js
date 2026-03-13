const express = require('express')
const router = express.Router()

const verifyGithubSignature = require('../middleware/verifyGithubSignature')
const extractEventData = require('../middleware/extractEventData')

const { webhookQueue } = require('../queue/webhookQueue')

router.post('/',
    verifyGithubSignature,
    extractEventData,
    async (req, res, next) => {
        try {
            const { type, deliveryId, payload } = req.githubEvent

            await webhookQueue.add(type, {
                type,
                deliveryId,
                payload,
                receivedAt: new Date().toISOString(),
            }, {
                jobId: deliveryId,
            })

            console.log(`[webhook] Enqueued job — event: ${type}, delivery: ${deliveryId}`)

            res.sendStatus(200)
        } catch (error) {
            next(error)
        }
    }
)

module.exports = router