const resolveExecutionOrder = (definition) => {
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
        const stuck = nodes
            .filter(n => !order.includes(n.id))
            .map(n => n.id)
        throw new Error(
            `Cycle detected in workflow graph. Stuck nodes: ${stuck.join(', ')}`
        )
    }

    return order
}

const getParentNodes = (nodeId, edges) => {
    return edges
        .filter(e => e.to === nodeId)
        .map(e => e.from)
}

module.exports = { resolveExecutionOrder, getParentNodes }
