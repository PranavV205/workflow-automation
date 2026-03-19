const { Queue } = require('bullmq')
const connection = require('../redis/redis')

const webhookQueue = new Queue("webhook-events", {
    connection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        timeout: 30_000,
        removeOnComplete: {
            age: 24 * 3600,
            count: 1000,
        },
        removeOnFail: false,
    }
})

module.exports = {
    webhookQueue,
    connection
}
