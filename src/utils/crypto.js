const crypto = require('crypto')

const computeHmac = (secret, rawBody) => {
    return 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')
}

const safeCompute = (a, b) => {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)

    if (bufA.length !== bufB.length) return false

    return crypto.timingSafeEqual(bufA, bufB)
}

const verifySignature = (secret, receivedSignature, rawBody) => (
    safeCompute(
        computeHmac(secret, rawBody),
        receivedSignature
    )
)

module.exports = {
    computeHmac,
    safeCompute,
    verifySignature
}