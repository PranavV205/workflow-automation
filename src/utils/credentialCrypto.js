const crypto = require('crypto')

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

const deriveKey = () => {
    const raw = process.env.CREDENTIAL_ENCRYPTION_KEY

    if (!raw) {
        throw new Error(
            'CREDENTIAL_ENCRYPTION_KEY is not set. ' +
            'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        )
    }

    if (/^[0-9a-f]{64}$/i.test(raw)) {
        return Buffer.from(raw, 'hex')
    }

    return crypto.createHash('sha256').update(raw).digest()
}

const encrypt = (plaintext) => {
    const key = deriveKey()
    const iv = crypto.randomBytes(IV_LENGTH)

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    })

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ])

    const authTag = cipher.getAuthTag()

    const packed = Buffer.concat([iv, encrypted, authTag])

    return packed.toString('base64')
}

const decrypt = (packed64) => {
    const key = deriveKey()
    const packed = Buffer.from(packed64, 'base64')

    if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH) {
        throw new Error('Encrypted payload is too short — data may be corrupt')
    }

    const iv = packed.subarray(0, IV_LENGTH)
    const authTag = packed.subarray(packed.length - AUTH_TAG_LENGTH)
    const ciphertext = packed.subarray(IV_LENGTH, packed.length - AUTH_TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    })
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ])

    return decrypted.toString('utf8')
}

module.exports = { encrypt, decrypt }
