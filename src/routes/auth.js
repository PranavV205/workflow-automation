const express = require('express')
const router = express.Router()
const googleOAuth = require('../oauth/googleOAuth')
const tokenStore = require('../oauth/tokenStore')
const connection = require('../redis/redis')
const log = require('../utils/logger')

router.get('/gmail', async (req, res, next) => {
    try {
        const { url, state } = googleOAuth.buildAuthorizationEndpoint()

        await connection.set(
            `oauth:state:${state}`,
            'pending',
            'EX',
            600
        )

        log.info('auth.gmail.started', { state })

        res.redirect(url)
    } catch (error) {
        next(error)
    }
})

router.get('/gmail/callback', async (req, res, next) => {
    try {
        if (req.query.error) {
            log.warn('auth.gmail.denied', { error: req.query.error })
            return res.status(400).json({ error: `Google denied access: ${req.query.error}` })
        }

        const { code, state } = req.query

        if (!code || !state) {
            return res.status(400).json({ error: 'Missing code or state parameter' })
        }

        const storedState = await connection.get(`oauth:state:${state}`)
        if (!storedState) {
            log.warn('auth.gmail.invalid_state', { state })
            return res.status(403).json({ error: 'Invalid or expired state' })
        }

        await connection.del(`oauth:state:${state}`)

        const data = await googleOAuth.exchangeCode(code)

        const saved = await tokenStore.save('default', data)

        log.info('auth.gmail.connected', { userId: 'default', scope: saved.scope })

        res.json({ status: 'connected', scope: saved.scope })
    } catch (error) {
        next(error)
    }
})

module.exports = router
