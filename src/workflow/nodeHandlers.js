const { UnrecoverableError } = require('bullmq')
const log = require('../utils/logger')

const fetchMetadata = async (context) => {
    const { payload, type, workflowId } = context

    if (!payload) {
        throw new UnrecoverableError(
            `Payload is missing: cannot process "${type}" event (workflowId=${workflowId})`
        )
    }

    if (!payload.repository) {
        throw new UnrecoverableError(
            `Payload missing "repository" field, malformed webhook (workflowId=${workflowId})`
        )
    }

    let branch = null
    let tag = null
    let refType = null

    if (payload.ref) {
        if (payload.ref.startsWith('refs/tags/')) {
            tag = payload.ref.replace('refs/tags/', '')
            refType = 'tag'
        } else if (payload.ref.startsWith('refs/heads/')) {
            branch = payload.ref.replace('refs/heads/', '')
            refType = 'branch'
        } else {
            branch = payload.ref
            refType = 'other'
        }
    }

    const metadata = {
        repo: payload.repository?.full_name ?? 'unknown',
        sender: payload.sender?.login ?? 'unknown',
        branch,
        tag,
        refType,
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

const validatePayload = async (context) => {
    const { payload, type, workflowId } = context

    if (!payload) {
        throw new UnrecoverableError(
            `Payload is missing: cannot validate "${type}" event (workflowId=${workflowId})`
        )
    }

    const errors = []

    if (!payload.repository) errors.push('missing "repository"')
    if (!payload.sender) errors.push('missing "sender"')

    if (type === 'push') {
        if (!payload.ref) errors.push('push event missing "ref"')
        if (!Array.isArray(payload.commits)) errors.push('push event missing "commits" array')
    }

    const valid = errors.length === 0

    log.info('step.validatePayload', {
        workflowId,
        type,
        valid,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
    })

    if (!valid) {
        throw new UnrecoverableError(
            `Payload validation failed (workflowId=${workflowId}): ${errors.join('; ')}`
        )
    }

    return { valid, validatedAt: new Date().toISOString() }
}

const transformData = async (context) => {
    const {
        type, deliveryId, receivedAt, workflowId,
        fetchMetadata: meta,
        validatePayload: validation,
    } = context

    if (!meta) {
        throw new UnrecoverableError(
            `transformData requires fetchMetadata output; step ordering error (workflowId=${workflowId})`
        )
    }

    if (!validation) {
        throw new UnrecoverableError(
            `transformData requires validatePayload output; step ordering error (workflowId=${workflowId})`
        )
    }

    let summary
    if (type === 'push' && meta.branch) {
        summary = `${meta.sender} pushed ${meta.commitCount} commit(s) to ${meta.branch} on ${meta.repo}`
    } else if (type === 'push' && meta.tag) {
        summary = `${meta.sender} pushed tag ${meta.tag} on ${meta.repo}`
    } else {
        summary = `${meta.sender} triggered "${type}" on ${meta.repo}`
    }

    const transformed = {
        eventType: type,
        deliveryId,
        repository: meta.repo,
        actor: meta.sender,
        branch: meta.branch,
        tag: meta.tag,
        commitCount: meta.commitCount,
        isDefaultBranch: meta.isDefaultBranch,
        validated: validation.valid,
        receivedAt,
        processedAt: new Date().toISOString(),
        summary,
    }

    log.info('step.transformData', {
        workflowId,
        summary: transformed.summary,
    })

    return transformed
}

const logSummary = async (context) => {
    const { transformData: data, workflowId } = context

    if (!data) {
        throw new UnrecoverableError(
            `logSummary requires transformData output; step ordering error (workflowId=${workflowId})`
        )
    }

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

const sendNotification = async (context) => {
    const { transformData: data, workflowId } = context

    if (!data) {
        throw new UnrecoverableError(
            `sendNotification requires transformData output; step ordering error (workflowId=${workflowId})`
        )
    }

    log.info('step.sendNotification', {
        workflowId,
        channel: 'log',
        repository: data.repository,
        actor: data.actor,
        summary: data.summary,
    })

    return {
        sent: true,
        channel: 'log',
        sentAt: new Date().toISOString(),
    }
}

const handlers = {
    fetchMetadata,
    validatePayload,
    transformData,
    logSummary,
    sendNotification,
}

const getHandler = (type) => {
    const handler = handlers[type]
    if (!handler) {
        throw new Error(`Unknown node type: "${type}"; no handler registered`)
    }
    return handler
}

module.exports = { handlers, getHandler }
