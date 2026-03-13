const handlePullRequest = async (jobData) => {
    const { deliveryId, payload } = jobData

    const repo = payload.repository?.full_name || 'unknown'
    const sender = payload.sender?.login || 'unknown'
    const action = payload.action || 'unknown'
    const prNumber = payload.pull_request?.number
    const prTitle = payload.pull_request?.title || 'unknown'

    console.log(`[pull_request] #${prNumber} "${prTitle}" ${action} by ${sender} on ${repo}`)
    console.log(`[pull_request] delivery=${deliveryId}`)

    await new Promise(resolve => setTimeout(resolve, 100))

    console.log(`[pull_request] Finished processing delivery ${deliveryId}`)
}

module.exports = handlePullRequest
