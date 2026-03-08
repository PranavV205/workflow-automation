require('dotenv').config()

const express = require('express')
const crypto = require('crypto')

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf
    }
}))

const verifyGithubSignature = (githubSignature, rawBody) => {
    const computedSignature = "sha256=" + crypto.createHmac('sha256', process.env.GITHUB_SECRET).update(rawBody).digest('hex')

    const a = Buffer.from(githubSignature)
    const b = Buffer.from(computedSignature)

    if (a.length !== b.length) return false

    return crypto.timingSafeEqual(a, b)
}

app.post("/webhook", (req, res) => {
    const event = req.headers["x-github-event"];
    const signature = req.headers["x-hub-signature-256"]
    if (!signature) return false

    if (!verifyGithubSignature(signature, req.rawBody)) {
        return res.sendStatus(401)
    }

    console.log(new Date().toISOString(), req.body);

    console.log("Event:", event);
    console.log("Payload:", req.body);

    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`)
})