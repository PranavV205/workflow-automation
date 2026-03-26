require('dotenv').config()

const express = require('express')

const captureRawBody = require('./middleware/rawBody')
const errorHandler = require('./middleware/errorHandler')
const webhookRouter = require('./routes/webhook')
const workflowRouter = require('./routes/workflowStatus')
const adminRouter = require('./routes/admin')
const authRouter = require('./routes/auth')
const log = require('./utils/logger')

const app = express()
const PORT = process.env.PORT || 3000

app.use(captureRawBody(express))

app.use("/webhook", webhookRouter);
app.use('/workflow', workflowRouter)
app.use('/admin', adminRouter)
app.use('/auth', authRouter)

app.use(errorHandler)

app.listen(PORT, () => {
    log.info('server.started', { port: PORT })
})
