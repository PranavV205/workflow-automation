const fs = require('fs')
const path = require('path')
const { getHandler } = require('./nodeHandlers')

const loadWorkflow = (filePath) => {
    const absolutePath = path.resolve(filePath)
    const raw = fs.readFileSync(absolutePath, 'utf-8')
    const definition = JSON.parse(raw)

    validate(definition)

    return definition
}

const validate = (definition) => {
    if (!definition.id) {
        throw new Error('Workflow definition missing "id"')
    }
    if (!definition.name) {
        throw new Error('Workflow definition missing "name"')
    }
    if (!Array.isArray(definition.nodes) || definition.nodes.length === 0) {
        throw new Error('Workflow must have at least one node')
    }
    if (!Array.isArray(definition.edges)) {
        throw new Error('Workflow must have an "edges" array (can be empty for single-node workflows)')
    }

    const nodeIds = new Set()

    for (const node of definition.nodes) {
        if (!node.id) {
            throw new Error('Node missing "id"')
        }
        if (!node.type) {
            throw new Error(`Node "${node.id}" missing "type"`)
        }
        if (nodeIds.has(node.id)) {
            throw new Error(`Duplicate node id: "${node.id}"`)
        }

        nodeIds.add(node.id)

        getHandler(node.type)
    }

    for (const edge of definition.edges) {
        if (!edge.from) {
            throw new Error('Edge missing "from"')
        }
        if (!edge.to) {
            throw new Error('Edge missing "to"')
        }
        if (!nodeIds.has(edge.from)) {
            throw new Error(`Edge references unknown source node: "${edge.from}"`)
        }
        if (!nodeIds.has(edge.to)) {
            throw new Error(`Edge references unknown target node: "${edge.to}"`)
        }
        if (edge.from === edge.to) {
            throw new Error(`Self-loop detected on node: "${edge.from}"`)
        }
    }
}

module.exports = { loadWorkflow, validate }
