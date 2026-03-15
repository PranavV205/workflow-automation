const fetchMetadata = async (context) => {
    const { payload, type } = context

    console.log(`  [step:fetchMetadata] Extracting metadata from "${type}" payload`)

    const metadata = {
        repo: payload.repository?.full_name ?? 'unknown',
        sender: payload.sender?.login ?? 'unknown',
        branch: payload.ref?.replace('refs/heads/', '') ?? null,
        commitCount: payload.commits?.length ?? 0,
        defaultBranch: payload.repository?.default_branch ?? 'main',
        isDefaultBranch: false,
    }

    metadata.isDefaultBranch = metadata.branch === metadata.defaultBranch

    console.log(`  [step:fetchMetadata] repo=${metadata.repo} branch=${metadata.branch} commits=${metadata.commitCount}`)

    return metadata
}

const transformData = async (context) => {
    const { type, deliveryId, receivedAt, fetchMetadata: meta } = context

    console.log(`  [step:transformData] Building enriched event for repo="${meta.repo}"`)

    const transformed = {
        eventType: type,
        deliveryId,
        repository: meta.repo,
        actor: meta.sender,
        branch: meta.branch,
        commitCount: meta.commitCount,
        isDefaultBranch: meta.isDefaultBranch,
        receivedAt,
        processedAt: new Date().toISOString(),
        summary: meta.branch
            ? `${meta.sender} pushed ${meta.commitCount} commit(s) to ${meta.branch} on ${meta.repo}`
            : `${meta.sender} triggered "${type}" on ${meta.repo}`,
    }

    console.log(`  [step:transformData] summary="${transformed.summary}"`)

    return transformed
}

const logSummary = async (context) => {
    const { transformData: data } = context

    console.log(`  [step:logSummary] ✓ Workflow complete`)
    console.log(`  [step:logSummary]   event:    ${data.eventType}`)
    console.log(`  [step:logSummary]   repo:     ${data.repository}`)
    console.log(`  [step:logSummary]   actor:    ${data.actor}`)
    console.log(`  [step:logSummary]   summary:  ${data.summary}`)
    console.log(`  [step:logSummary]   delivery: ${data.deliveryId}`)

    return {
        logged: true,
        loggedAt: new Date().toISOString(),
    }
}

const STEPS = [
    { name: 'fetchMetadata', fn: fetchMetadata },
    { name: 'transformData', fn: transformData },
    { name: 'logSummary', fn: logSummary },
]

module.exports = STEPS
