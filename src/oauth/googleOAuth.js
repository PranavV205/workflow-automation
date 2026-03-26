const crypto = require("crypto")

const DEFAULT_GOOGLE_SCOPES = "https://www.googleapis.com/auth/gmail.readonly"

function resolveGoogleScopes() {
    const rawScopes = process.env.GOOGLE_SCOPES

    if (!rawScopes || !rawScopes.trim()) {
        return DEFAULT_GOOGLE_SCOPES
    }

    return rawScopes
        .split(/[,\s]+/)
        .filter(Boolean)
        .join(" ")
}

function buildAuthorizationEndpoint() {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")

    const params = {
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        response_type: "code",
        scope: resolveGoogleScopes(),
        access_type: "offline",
        prompt: "consent",
        state: crypto.randomBytes(16).toString('hex')
    }

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
    })

    return { url: url.toString(), state: params.state }
}

async function exchangeCode(code) {
    const params = {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        code: code,
        grant_type: "authorization_code"
    }

    try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(params).toString()
        })

        if (!response.ok) {
            const errorBody = await response.json()
            throw new Error(`Token request failed: ${errorBody.error} - ${errorBody.error_description}`)
        }

        const data = await response.json()
        return data
    } catch (error) {
        throw new Error(`Token exchange failed: ${error.message}`)
    }
}

async function refreshAccessToken(refreshToken) {
    const params = {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
    }

    try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(params).toString()
        })

        if (!response.ok) {
            const errorBody = await response.json()
            throw new Error(`Token request failed: ${errorBody.error} - ${errorBody.error_description}`)
        }

        const data = await response.json()
        return data
    } catch (error) {
        throw new Error(`Token exchange failed: ${error.message}`)
    }
}

module.exports = {
    buildAuthorizationEndpoint,
    exchangeCode,
    refreshAccessToken
}
