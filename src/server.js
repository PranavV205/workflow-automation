require('dotenv').config()

const express = require('express')

const captureRawBody = require('./middleware/rawBody')
const errorHandler = require('./middleware/errorHandler')
const webhookRouter = require('./routes/webhook')
const workflowRouter = require('./routes/workflowStatus')

const app = express()
const PORT = process.env.PORT || 3000

app.use(captureRawBody(express))

app.use("/webhook", webhookRouter);
app.use('/workflow', workflowRouter)

app.use(errorHandler)

app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`)
})
