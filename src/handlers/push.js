const webhookEmitter = require('../services/webhookEmitter')

webhookEmitter.on('push', async (event) => {
    const { repo, sender, raw } = event
    const branch = raw.ref?.replace('refs/heads/', '') || 'unknown'
    const commitCount = raw.commits?.length || 0

    console.log(`[push] ${sender} pushed ${commitCount} commit(s) to ${branch} on ${repo}`)
})

webhookEmitter.on('push', async (event) => {
    console.log(`[push:audit] Delivery ${event.deliveryId} logged at ${event.receivedAt}`)
})