const EventEmitter = require('node:events')

const webhookEmitter = new EventEmitter(0)

webhookEmitter.on('unhandled', ({ type, payload }) => {
    console.warn(`[webhookEmitter] No handler registered for event: "${type}"`)
})

module.exports = webhookEmitter