const { refreshAccessToken } = require('../oauth/oauthClient')
const tokenStore = require('../oauth/tokenStore')
const log = require('../utils/logger')

const ensureFreshToken = async (userId, provider = 'google') => {
    const token = await tokenStore.get(provider, userId)

    if (!token) {
        throw new Error(
            `No credentials found for ${provider}:${userId} — re-authenticate at /auth/${provider}`
        )
    }

    if (!token.isExpired) {
        log.info('tokenRefresh.valid', { userId, provider })
        return token.accessToken
    }

    if (!token.refreshToken) {
        throw new Error(
            `Token expired and no refresh token stored for ${provider}:${userId} — re-authenticate at /auth/${provider}`
        )
    }

    log.info('tokenRefresh.refreshing', { userId, provider })

    const refreshed = await refreshAccessToken(provider, token.refreshToken)

    const rotated = !!refreshed.refresh_token
    if (!rotated) {
        refreshed.refresh_token = token.refreshToken
    }

    await tokenStore.save(provider, userId, refreshed)

    log.info('tokenRefresh.refreshed', { userId, provider, rotated })

    return refreshed.access_token
}

module.exports = { ensureFreshToken }
