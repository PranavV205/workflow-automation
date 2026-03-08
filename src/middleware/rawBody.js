const captureRawBody = express => express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf
    }
})

module.exports = captureRawBody