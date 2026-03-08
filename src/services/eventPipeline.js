const validateEvent = async ({ type, deliveryId, payload }) => {
    if (!type) throw new Error('Event type is required')
    if (!payload) throw new Error('Payload is required')
    return { type, deliveryId, payload }
}

const transformEvent = async ({ type, deliveryId, payload }) => ({
    type,
    deliveryId,
    repo: payload.repository?.full_name || 'unknown',
    sender: payload.sender?.login || 'unknown',
    receivedAt: new Date().toISOString(),
    raw: payload
})

const logEvent = async (event) => {
    console.log('[eventPipeline] Processed event:', JSON.stringify(event, null, 2))
    return event
}

const runPipeline = async (eventData) => {
    const validated = await validateEvent(eventData)
    const transformed = await transformEvent(validated)
    const logged = await logEvent(transformed)
    return logged
}

module.exports = {
    validateEvent,
    transformEvent,
    logEvent,
    runPipeline
}
