const connection = require('../redis/redis')
const log = require('../utils/logger')

const toTokenKey = (userId) => `oauth:gmail:${userId}`

const save = async (userId, tokenData) => {
    const record = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        tokenType: tokenData.token_type,
        scope: tokenData.scope,
        savedAt: Date.now()
    }

    const key = toTokenKey(userId)

    await connection.set(
        key,
        JSON.stringify(record),
        'EX',
        86400 * 30
    )

    log.info('tokenStore.saved', { userId, scope: record.scope })

    return record
}

const get = async (userId) => {
    const key = toTokenKey(userId)
    const raw = await connection.get(key)

    if (!raw) return null

    const record = JSON.parse(raw)

    const expiresAt = record.savedAt + (record.expiresIn * 1000)
    const isExpired = Date.now() > (expiresAt - 60000)

    return {
        ...record,
        isExpired
    }
}

const del = async (userId) => {
    const key = toTokenKey(userId)

    await connection.del(key)

    log.info('tokenStore.deleted', { userId })
}

module.exports = { save, get, del }
