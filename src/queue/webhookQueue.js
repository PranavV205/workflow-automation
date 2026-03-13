const { Queue } = require('bullmq')
const connection = require('../redis/redis')

const webhookQueue = new Queue("webhook-events", {
    connection,
    defaultJobOptions: {
        attempts: 3,                 // retry up to 3 times on failure
        backoff: {
            type: 'exponential',
            delay: 1000              // 1s → 2s → 4s between retry attempts
        },
        removeOnComplete: 100,       // keep last 100 completed jobs in Redis
        removeOnFail: 500,           // keep last 500 failed jobs for debugging
    }
})

module.exports = {
    webhookQueue,
    connection
}
