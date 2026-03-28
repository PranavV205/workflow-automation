const connection = require('../redis/redis')
const log = require('../utils/logger')
const { encrypt, decrypt } = require('../utils/credentialCrypto')

const toTokenKey = (provider, userId) => `oauth:${provider}:${userId}`

const save = async (provider, userId, tokenData) => {
    const record = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        tokenType: tokenData.token_type,
        scope: tokenData.scope,
        savedAt: Date.now()
    }

    const key = toTokenKey(provider, userId)
    const ciphertext = encrypt(JSON.stringify(record))

    await connection.set(
        key,
        ciphertext,
        'EX',
        86400 * 30
    )

    log.info('tokenStore.saved', { provider, userId, scope: record.scope, encrypted: true })

    return record
}

const get = async (provider, userId) => {
    const key = toTokenKey(provider, userId)
    const raw = await connection.get(key)

    if (!raw) return null

    const record = JSON.parse(decrypt(raw))

    const expiresAt = record.savedAt + (record.expiresIn * 1000)
    const isExpired = Date.now() > (expiresAt - 60000)

    log.info('tokenStore.decrypted', { provider, userId, isExpired })

    return {
        ...record,
        isExpired
    }
}

const del = async (provider, userId) => {
    const key = toTokenKey(provider, userId)

    await connection.del(key)

    log.info('tokenStore.deleted', { provider, userId })
}

module.exports = { save, get, del }
