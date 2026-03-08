const errorHandler = (err, req, res, next) => {
    const status = err.statusCode || 500
    const message = err.message || 'Internal server error'

    console.error(`[${new Date().toISOString()}] ${status} — ${message}`)

    res.status(status).json({ error: message })
}

module.exports = errorHandler