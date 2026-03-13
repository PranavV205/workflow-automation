const { Redis } = require('ioredis')

const connection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
})

connection.on('connect', () => console.log('[redis] Connected'))
connection.on('error', (err) => console.error('[redis] Error:', err.message))

module.exports = connection
