const { UnrecoverableError } = require('bullmq')
const log = require('../utils/logger')

const fetchMetadata = async (context) => {
    const { payload, type, workflowId } = context

    if (!payload) {
        throw new UnrecoverableError(
            `Payload is missing — cannot process "${type}" event (workflowId=${workflowId})`
        )
    }

    if (!payload.repository) {
        throw new UnrecoverableError(
            `Payload missing "repository" field — malformed webhook (workflowId=${workflowId})`
        )
    }

    const metadata = {
        repo: payload.repository?.full_name ?? 'unknown',
        sender: payload.sender?.login ?? 'unknown',
        branch: payload.ref?.replace('refs/heads/', '') ?? null,
        commitCount: payload.commits?.length ?? 0,
        defaultBranch: payload.repository?.default_branch ?? 'main',
        isDefaultBranch: false,
    }

    metadata.isDefaultBranch = metadata.branch === metadata.defaultBranch

    log.info('step.fetchMetadata', {
        workflowId,
        repo: metadata.repo,
        branch: metadata.branch,
        commits: metadata.commitCount,
    })

    return metadata
}

const transformData = async (context) => {
    const { type, deliveryId, receivedAt, workflowId, fetchMetadata: meta } = context

    if (!meta) {
        throw new UnrecoverableError(
            `transformData requires fetchMetadata output — step ordering error (workflowId=${workflowId})`
        )
    }

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

    log.info('step.transformData', {
        workflowId,
        summary: transformed.summary,
    })

    return transformed
}

const logSummary = async (context) => {
    const { transformData: data, workflowId } = context

    log.info('step.logSummary', {
        workflowId,
        eventType: data.eventType,
        repository: data.repository,
        actor: data.actor,
        summary: data.summary,
        deliveryId: data.deliveryId,
    })

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
