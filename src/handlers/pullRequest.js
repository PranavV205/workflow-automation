const webhookEmitter = require('../services/webhookEmitter')

webhookEmitter.on('pull_request', async (event) => {
    const { repo, sender, raw } = event
    const action = raw.action
    const prTitle = raw.pull_request?.title || 'unknown'
    const prNumber = raw.pull_request?.number

    console.log(`[pull_request] #${prNumber} "${prTitle}" was ${action} by ${sender} on ${repo}`)
})