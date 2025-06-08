function buildGraphFromLines(lineFeatures, toleranceMeters = 0) {
    // Build a graph: nodes are coordinates, edges are line segments with distances
    // toleranceMeters: merge points that are within this distance (in meters)
    const graph = {};
    const nodeMap = new Map(); // Maps original coordinates to merged node keys
    const mergedNodes = new Map(); // Maps merged node keys to their representative coordinates

    // Convert meters to approximate degrees (rough approximation)
    const toleranceKm = toleranceMeters / 1000;

    function findOrCreateMergedNode(coord) {
        const coordStr = coord.join(",");

        // Check if this coordinate already has a merged node
        if (nodeMap.has(coordStr)) {
            return nodeMap.get(coordStr);
        }

        // If tolerance is 0, just use the coordinate as-is
        if (toleranceMeters <= 0) {
            nodeMap.set(coordStr, coordStr);
            mergedNodes.set(coordStr, coord);
            return coordStr;
        }

        // Look for existing nodes within tolerance
        for (const [existingKey, existingCoord] of mergedNodes) {
            const distance = turf.distance(turf.point(coord), turf.point(existingCoord), { units: 'kilometers' });
            if (distance <= toleranceKm) {
                // Found a close node, use it
                nodeMap.set(coordStr, existingKey);
                return existingKey;
            }
        }

        // No close node found, create a new one
        nodeMap.set(coordStr, coordStr);
        mergedNodes.set(coordStr, coord);
        return coordStr;
    }

    // Process all line features
    for (const feature of lineFeatures) {
        const coords = feature.geometry.coordinates;
        for (let i = 0; i < coords.length - 1; i++) {
            const a = coords[i];
            const b = coords[i + 1];

            // Get merged node keys
            const keyA = findOrCreateMergedNode(a);
            const keyB = findOrCreateMergedNode(b);

            // Skip if both points merged to the same node
            if (keyA === keyB) continue;

            // Get the representative coordinates for distance calculation
            const coordA = mergedNodes.get(keyA);
            const coordB = mergedNodes.get(keyB);
            const dist = turf.distance(turf.point(coordA), turf.point(coordB), { units: 'kilometers' });

            // Initialize graph nodes if they don't exist
            if (!graph[keyA]) graph[keyA] = [];
            if (!graph[keyB]) graph[keyB] = [];

            // Check if edge already exists to avoid duplicates
            const existingEdgeA = graph[keyA].find(edge => edge.node === keyB);
            if (!existingEdgeA) {
                graph[keyA].push({ node: keyB, coord: coordB, weight: dist });
            }

            const existingEdgeB = graph[keyB].find(edge => edge.node === keyA);
            if (!existingEdgeB) {
                graph[keyB].push({ node: keyA, coord: coordA, weight: dist });
            }
        }
    }

    return graph;
}

function findClosestNode(graph, point) {
    // Find the closest node in the graph to the given point
    let minDist = Infinity;
    let closestKey = null;
    const pt = point.geometry.coordinates;
    for (const key in graph) {
        const nodeCoord = key.split(",").map(Number);
        const d = turf.distance(turf.point(pt), turf.point(nodeCoord));
        if (d < minDist) {
            minDist = d;
            closestKey = key;
        }
    }
    return closestKey;
}

function dijkstra(graph, startKey, endKey) {
    // Simple Dijkstra's algorithm
    const distances = {};
    const prev = {};
    const queue = new Set(Object.keys(graph));
    for (const node of queue) {
        distances[node] = Infinity;
    }
    distances[startKey] = 0;
    while (queue.size > 0) {
        let u = null;
        let minDist = Infinity;
        for (const node of queue) {
            if (distances[node] < minDist) {
                minDist = distances[node];
                u = node;
            }
        }
        if (u === endKey || u === null) break;
        queue.delete(u);
        for (const neighbor of graph[u]) {
            const alt = distances[u] + neighbor.weight;
            if (alt < distances[neighbor.node]) {
                distances[neighbor.node] = alt;
                prev[neighbor.node] = u;
            }
        }
    }
    // Reconstruct path
    const path = [];
    let u = endKey;
    while (u) {
        path.unshift(u);
        u = prev[u];
    }
    return path;
}

function getCoordsFromPath(path) {
    return path.map(key => key.split(",").map(Number));
}

function findShortestPath(lineFeatures, startCoord, endCoord, toleranceMeters = 0) {
    // Build graph with tolerance
    const graph = buildGraphFromLines(lineFeatures, toleranceMeters);

    // Create point objects for start and end coordinates
    const startPoint = { geometry: { coordinates: startCoord } };
    const endPoint = { geometry: { coordinates: endCoord } };

    // Find closest nodes in the graph
    const startKey = findClosestNode(graph, startPoint);
    const endKey = findClosestNode(graph, endPoint);

    if (!startKey || !endKey) {
        console.warn('Could not find start or end node in graph');
        return null;
    }

    // Find shortest path
    const path = dijkstra(graph, startKey, endKey);

    if (path.length === 0 || !path[0]) {
        console.warn('No path found between start and end points');
        return null;
    }

    // Convert path to coordinates
    const coordinates = getCoordsFromPath(path);

    return {
        path: coordinates,
        pathKeys: path,
        startKey,
        endKey,
        graph
    };
}