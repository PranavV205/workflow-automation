const handlePush = async (jobData) => {
    const { deliveryId, payload, receivedAt } = jobData

    const repo = payload.repository?.full_name || 'unknown'
    const sender = payload.sender?.login || 'unknown'
    const branch = payload.ref?.replace('refs/heads/', '') || 'unknown'
    const commitCount = payload.commits?.length || 0

    console.log(`[push] ${sender} pushed ${commitCount} commit(s) to ${branch} on ${repo}`)
    console.log(`[push] delivery=${deliveryId} receivedAt=${receivedAt}`)

    await new Promise(resolve => setTimeout(resolve, 100))

    console.log(`[push] Finished processing delivery ${deliveryId}`)
}

module.exports = handlePush
