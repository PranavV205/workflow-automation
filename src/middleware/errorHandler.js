const log = require('../utils/logger')

const errorHandler = (err, req, res, next) => {
    const status = err.statusCode || 500
    const message = err.message || 'Internal server error'

    log.error('http.error', {
        status,
        message,
        method: req.method,
        path: req.originalUrl,
        stack: status === 500 ? err.stack : undefined,
    })

    res.status(status).json({ error: message })
}

module.exports = errorHandler
