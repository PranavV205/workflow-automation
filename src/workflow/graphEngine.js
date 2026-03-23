const buildGraph = (definition) => {
    const { nodes, edges } = definition

    const adjacency = new Map()
    const inDegree = new Map()

    for (const node of nodes) {
        adjacency.set(node.id, [])
        inDegree.set(node.id, 0)
    }

    for (const edge of edges) {
        adjacency.get(edge.from).push(edge.to)
        inDegree.set(edge.to, inDegree.get(edge.to) + 1)
    }

    return { adjacency, inDegree }
}

const detectCycleError = (nodes, processedIds) => {
    const stuck = nodes
        .filter(n => !processedIds.has(n.id))
        .map(n => n.id)
    throw new Error(
        `Cycle detected in workflow graph. Stuck nodes: ${stuck.join(', ')}`
    )
}

const resolveExecutionOrder = (definition) => {
    const { nodes } = definition
    const { adjacency, inDegree } = buildGraph(definition)

    const queue = []
    for (const [nodeId, degree] of inDegree) {
        if (degree === 0) queue.push(nodeId)
    }

    const order = []

    while (queue.length > 0) {
        const current = queue.shift()
        order.push(current)

        for (const neighbor of adjacency.get(current)) {
            const newDegree = inDegree.get(neighbor) - 1
            inDegree.set(neighbor, newDegree)
            if (newDegree === 0) queue.push(neighbor)
        }
    }

    if (order.length !== nodes.length) {
        detectCycleError(nodes, new Set(order))
    }

    return order
}

const resolveExecutionLevels = (definition) => {
    const { nodes } = definition
    const { adjacency, inDegree } = buildGraph(definition)

    const queue = []
    for (const [nodeId, degree] of inDegree) {
        if (degree === 0) queue.push(nodeId)
    }

    const levels = []
    let processed = 0

    while (queue.length > 0) {
        const currentLevel = [...queue]
        queue.length = 0

        for (const current of currentLevel) {
            processed++
            for (const neighbor of adjacency.get(current)) {
                const newDegree = inDegree.get(neighbor) - 1
                inDegree.set(neighbor, newDegree)
                if (newDegree === 0) queue.push(neighbor)
            }
        }

        levels.push(currentLevel)
    }

    if (processed !== nodes.length) {
        detectCycleError(nodes, new Set(levels.flat()))
    }

    return levels
}

const getDownstreamNodes = (startNodeIds, definition) => {
    const { adjacency } = buildGraph(definition)
    const downstream = new Set()
    const queue = [...startNodeIds]

    while (queue.length > 0) {
        const current = queue.shift()
        for (const neighbor of adjacency.get(current)) {
            if (!downstream.has(neighbor)) {
                downstream.add(neighbor)
                queue.push(neighbor)
            }
        }
    }

    return downstream
}

const getParentNodes = (nodeId, edges) => {
    return edges
        .filter(e => e.to === nodeId)
        .map(e => e.from)
}

module.exports = {
    resolveExecutionOrder,
    resolveExecutionLevels,
    getDownstreamNodes,
    getParentNodes,
}
