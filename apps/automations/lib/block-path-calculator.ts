/**
 * Block path calculator — ported from Sim.
 * Reverse BFS traversal to find all ancestor blocks connected via edges.
 */
export class BlockPathCalculator {
  /**
   * Finds all blocks along paths leading to the target block.
   * Reverse traversal from the target node to find all ancestors via BFS.
   */
  static findAllPathNodes(
    edges: Array<{ source: string; target: string }>,
    targetNodeId: string
  ): string[] {
    const nodeDistances = new Map<string, number>()
    const visited = new Set<string>()
    const queue: [string, number][] = [[targetNodeId, 0]]
    const pathNodes = new Set<string>()

    // Build reverse adjacency list (target → sources)
    const reverseAdjList: Record<string, string[]> = {}
    for (const edge of edges) {
      if (!reverseAdjList[edge.target]) {
        reverseAdjList[edge.target] = []
      }
      reverseAdjList[edge.target].push(edge.source)
    }

    // BFS to find all ancestors and their shortest distance from target
    while (queue.length > 0) {
      const [currentNodeId, distance] = queue.shift()!

      if (visited.has(currentNodeId)) {
        const currentDistance = nodeDistances.get(currentNodeId) ?? Infinity
        if (distance < currentDistance) {
          nodeDistances.set(currentNodeId, distance)
        }
        continue
      }

      visited.add(currentNodeId)
      nodeDistances.set(currentNodeId, distance)

      if (currentNodeId !== targetNodeId) {
        pathNodes.add(currentNodeId)
      }

      const incomingNodeIds = reverseAdjList[currentNodeId] || []
      for (const sourceId of incomingNodeIds) {
        queue.push([sourceId, distance + 1])
      }
    }

    return Array.from(pathNodes)
  }

  /**
   * Get distances for all path nodes (used for sorting tags by proximity).
   */
  static getNodeDistances(
    edges: Array<{ source: string; target: string }>,
    targetNodeId: string
  ): Map<string, number> {
    const nodeDistances = new Map<string, number>()
    const visited = new Set<string>()
    const queue: [string, number][] = [[targetNodeId, 0]]

    const reverseAdjList: Record<string, string[]> = {}
    for (const edge of edges) {
      if (!reverseAdjList[edge.target]) {
        reverseAdjList[edge.target] = []
      }
      reverseAdjList[edge.target].push(edge.source)
    }

    while (queue.length > 0) {
      const [currentNodeId, distance] = queue.shift()!
      if (visited.has(currentNodeId)) continue
      visited.add(currentNodeId)
      nodeDistances.set(currentNodeId, distance)

      const incomingNodeIds = reverseAdjList[currentNodeId] || []
      for (const sourceId of incomingNodeIds) {
        queue.push([sourceId, distance + 1])
      }
    }

    return nodeDistances
  }
}
