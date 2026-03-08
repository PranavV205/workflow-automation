const { verifySignature } = require('../utils/crypto')

const verifyGithubSignature = (req, res, next) => {
    const signature = req.headers['x-hub-signature-256']
    if (!signature) {
        const err = new Error('Missing x-hub-signature-256 header')
        err.statusCode = 401
        return next(err)
    }

    if (!verifySignature(
        process.env.GITHUB_SECRET,
        signature,
        req.rawBody
    )) {
        const err = new Error('Signature mismatch — request did not come from GitHub')
        err.statusCode = 401
        return next(err)
    }

    req, githubSignature = signature
    next()
}

module.exports = verifyGithubSignature