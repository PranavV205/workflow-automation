const extractEventData = (req, res, next) => {
    const type = req.headers['x-github-event']
    const deliveryId = req.headers['x-github-delivery']

    if (!type) {
        const err = new Error('Missing x-github-event header')
        err.statusCode = 400
        return next(err)
    }

    if (!deliveryId) {
        const err = new Error('Missing x-github-delivery header')
        err.statusCode = 400
        return next(err)
    }

    req.githubEvent = {
        type,
        deliveryId,
        payload: req.body
    }

    next()
}

module.exports = extractEventData