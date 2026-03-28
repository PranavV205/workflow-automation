const express = require('express')
const router = express.Router()
const { getProvider } = require('../oauth/providers')
const { buildAuthorizationUrl, exchangeCode } = require('../oauth/oauthClient')
const tokenStore = require('../oauth/tokenStore')
const connection = require('../redis/redis')
const log = require('../utils/logger')

router.get('/:provider', async (req, res, next) => {
    try {
        const { provider } = req.params
        getProvider(provider)

        const { url, state } = buildAuthorizationUrl(provider)

        await connection.set(`oauth:state:${state}`, provider, 'EX', 600)

        log.info('auth.started', { provider, state })

        res.redirect(url)
    } catch (error) {
        next(error)
    }
})

router.get('/:provider/callback', async (req, res, next) => {
    try {
        const { provider } = req.params

        if (req.query.error) {
            log.warn('auth.denied', { provider, error: req.query.error })
            return res.status(400).json({ error: `${provider} denied access: ${req.query.error}` })
        }

        const { code, state } = req.query

        if (!code || !state) {
            return res.status(400).json({ error: 'Missing code or state parameter' })
        }

        const storedProvider = await connection.get(`oauth:state:${state}`)
        if (!storedProvider) {
            log.warn('auth.invalid_state', { provider, state })
            return res.status(403).json({ error: 'Invalid or expired state' })
        }

        if (storedProvider !== provider) {
            log.warn('auth.provider_mismatch', { expected: storedProvider, got: provider })
            return res.status(403).json({ error: 'Provider mismatch in state' })
        }

        await connection.del(`oauth:state:${state}`)

        const tokenData = await exchangeCode(provider, code)
        const saved = await tokenStore.save(provider, 'default', tokenData)

        log.info('auth.connected', { provider, userId: 'default', scope: saved.scope })

        res.json({ status: 'connected', provider, scope: saved.scope })
    } catch (error) {
        next(error)
    }
})

module.exports = router
