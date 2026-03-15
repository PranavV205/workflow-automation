const express = require('express')
const router = express.Router()
const workflowState = require('../workflow/workflowState')

router.get('/:workflowId', async (req, res, next) => {
    try {
        const workflow = await workflowState.get(req.params.workflowId)
        if (!workflow) return res.status(404).json({ error: 'Workflow not found' })
        res.json(workflow)
    } catch (err) {
        next(err)
    }
})

router.get('/delivery/:deliveryId', async (req, res, next) => {
    try {
        const workflow = await workflowState.getByDelivery(req.params.deliveryId)
        if (!workflow) return res.status(404).json({ error: 'Workflow not found' })
        res.json(workflow)
    } catch (err) {
        next(err)
    }
})

module.exports = router
