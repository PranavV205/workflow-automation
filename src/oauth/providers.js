const google = {
    name: 'google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: () => process.env.GOOGLE_REDIRECT_URI,
    scopes: () => {
        const raw = process.env.GOOGLE_SCOPES
        if (!raw?.trim()) return 'https://www.googleapis.com/auth/gmail.readonly'
        return raw.split(/[,\s]+/).filter(Boolean).join(' ')
    },
    authParams: { access_type: 'offline', prompt: 'consent' },
}

const slack = {
    name: 'slack',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    clientId: () => process.env.SLACK_CLIENT_ID,
    clientSecret: () => process.env.SLACK_CLIENT_SECRET,
    redirectUri: () => process.env.SLACK_REDIRECT_URI,
    scopes: () => process.env.SLACK_SCOPES || 'channels:read,chat:write',
    authParams: {},
    parseTokenResponse: (data) => {
        if (!data.ok) {
            throw new Error(`Slack token error: ${data.error}`)
        }
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token ?? null,
            expires_in: data.expires_in ?? null,
            token_type: data.token_type ?? 'bot',
            scope: data.scope,
        }
    },
}

const registry = { google, slack }

const getProvider = (name) => {
    const provider = registry[name]
    if (!provider) {
        throw new Error(`Unknown OAuth provider: "${name}". Registered: ${Object.keys(registry).join(', ')}`)
    }
    return provider
}

module.exports = { getProvider }
