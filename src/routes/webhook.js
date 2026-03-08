const express = require('express')
const router = express.Router()

const verifyGithubSignature = require('../middleware/verifyGithubSignature')
const extractEventData = require('../middleware/extractEventData')
const { runPipeline } = require('../services/eventPipeline')
const webhookEmitter = require('../services/webhookEmitter')

require('../handlers/push')
require('../handlers/pullRequest')

router.post('/',
    verifyGithubSignature,
    extractEventData,
    async (req, res, next) => {
        try {
            const { type, deliveryId, payload } = req.githubEvent

            const processedEvent = await runPipeline({ type, deliveryId, payload })

            if (webhookEmitter.listenerCount(type) > 0) {
                webhookEmitter.emit(type, processedEvent)
            } else {
                webhookEmitter.emit('unhandled', { type, payload })
            }

            res.sendStatus(200)
        } catch (error) {
            next(error)
        }
    }
)

module.exports = router