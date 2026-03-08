const express = require('express')

const app = express()
const PORT = 3000

app.use(express.json())

app.post("/webhook", (req, res) => {
    const event = req.headers["x-github-event"];

    console.log(new Date().toISOString(), req.body);

    console.log("Event:", event);
    console.log("Payload:", req.body);

    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`)
})