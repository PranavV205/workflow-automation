const crypto = require('crypto')
const { getProvider } = require('./providers')

const buildAuthorizationUrl = (providerName) => {
    const provider = getProvider(providerName)
    const url = new URL(provider.authUrl)
    const state = crypto.randomBytes(16).toString('hex')

    const params = {
        client_id: provider.clientId(),
        redirect_uri: provider.redirectUri(),
        response_type: 'code',
        scope: provider.scopes(),
        state,
        ...provider.authParams,
    }

    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

    return { url: url.toString(), state }
}

const exchangeCode = async (providerName, code) => {
    const provider = getProvider(providerName)

    const params = {
        client_id: provider.clientId(),
        client_secret: provider.clientSecret(),
        redirect_uri: provider.redirectUri(),
        code,
        grant_type: 'authorization_code',
    }

    const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params).toString(),
    })

    if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(`Token exchange failed (${providerName}): ${err.error} - ${err.error_description}`)
    }

    const data = await response.json()
    return provider.parseTokenResponse ? provider.parseTokenResponse(data) : data
}

const refreshAccessToken = async (providerName, existingRefreshToken) => {
    const provider = getProvider(providerName)

    const params = {
        client_id: provider.clientId(),
        client_secret: provider.clientSecret(),
        refresh_token: existingRefreshToken,
        grant_type: 'refresh_token',
    }

    const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params).toString(),
    })

    if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(`Token refresh failed (${providerName}): ${err.error} - ${err.error_description}`)
    }

    const data = await response.json()
    return provider.parseTokenResponse ? provider.parseTokenResponse(data) : data
}

module.exports = { buildAuthorizationUrl, exchangeCode, refreshAccessToken }
