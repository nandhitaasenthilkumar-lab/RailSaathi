function findShortestPath(nodes, edges, startName, destinationName, accessibleOnly = false) {
  const startNode = nodes.find(
    (node) => node.name.toLowerCase() === startName.toLowerCase()
  );

  const destinationNode = nodes.find(
    (node) => node.name.toLowerCase() === destinationName.toLowerCase()
  );

  if (!startNode || !destinationNode) {
    return null;
  }

  const distances = {};
  const previous = {};
  const unvisited = new Set();

  nodes.forEach((node) => {
    distances[node._id.toString()] = Infinity;
    previous[node._id.toString()] = null;
    unvisited.add(node._id.toString());
  });

  distances[startNode._id.toString()] = 0;

  while (unvisited.size > 0) {
    let currentId = null;
    let smallestDistance = Infinity;

    for (const nodeId of unvisited) {
      if (distances[nodeId] < smallestDistance) {
        smallestDistance = distances[nodeId];
        currentId = nodeId;
      }
    }

    if (currentId === null) {
      break;
    }

    if (currentId === destinationNode._id.toString()) {
      break;
    }

    unvisited.delete(currentId);

    const connectedEdges = edges.filter(
      (edge) => edge.from.toString() === currentId
    );

    for (const edge of connectedEdges) {
      if (accessibleOnly && !edge.accessible) {
        continue;
      }

      const neighborId = edge.to.toString();

      if (!unvisited.has(neighborId)) {
        continue;
      }

      const newDistance =
        distances[currentId] + edge.distance;

      if (newDistance < distances[neighborId]) {
        distances[neighborId] = newDistance;
        previous[neighborId] = currentId;
      }
    }
  }

  const destinationId = destinationNode._id.toString();

  if (distances[destinationId] === Infinity) {
    return null;
  }

  const path = [];

  let currentId = destinationId;

  while (currentId !== null) {
    const node = nodes.find(
      (item) => item._id.toString() === currentId
    );

    if (node) {
      path.unshift(node);
    }

    currentId = previous[currentId];
  }

  return {
    distance: distances[destinationId],
    path
  };
}

module.exports = {
  findShortestPath
};