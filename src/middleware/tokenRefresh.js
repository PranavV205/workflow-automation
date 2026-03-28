const { refreshAccessToken } = require('../oauth/googleOAuth')
const tokenStore = require('../oauth/tokenStore')
const log = require('../utils/logger')

const ensureFreshToken = async (userId, provider = 'google') => {
    const token = await tokenStore.get(userId)

    if (!token) {
        throw new Error(
            `No credentials found for ${provider}:${userId} — re-authenticate at /auth/gmail`
        )
    }

    if (!token.isExpired) {
        log.info('tokenRefresh.valid', { userId, provider })
        return token.accessToken
    }

    if (!token.refreshToken) {
        throw new Error(
            `Token expired and no refresh token stored for ${provider}:${userId} — re-authenticate at /auth/gmail`
        )
    }

    log.info('tokenRefresh.refreshing', { userId, provider })

    const refreshed = await refreshAccessToken(token.refreshToken)

    const rotated = !!refreshed.refresh_token
    if (!rotated) {
        refreshed.refresh_token = token.refreshToken
    }

    await tokenStore.save(userId, refreshed)

    log.info('tokenRefresh.refreshed', { userId, provider, rotated })

    return refreshed.access_token
}

module.exports = { ensureFreshToken }
