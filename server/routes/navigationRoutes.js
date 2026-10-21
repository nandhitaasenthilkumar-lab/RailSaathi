
const express = require("express");

const NavigationNode = require("../models/NavigationNode");
const NavigationEdge = require("../models/NavigationEdge");
const Obstacle = require("../models/Obstacle");

const {
  findShortestPath
} = require("../services/navigationService");

const router = express.Router();

// Convert an ObjectId or a populated document reference to a string ID.
function getId(value) {
  if (!value) return null;

  if (value._id) {
    return value._id.toString();
  }

  return value.toString();
}

// Normalize location names for exact, case-insensitive matching.
function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

// GET ALL NAVIGATION NODES AND EDGES
router.get("/:stationCode", async (req, res) => {
  try {
    const stationCode = req.params.stationCode.toUpperCase();

    const nodes = await NavigationNode.find({ stationCode });
    const edges = await NavigationEdge.find({ stationCode });

    res.json({
      stationCode,
      nodes,
      edges
    });
  } catch (error) {
    console.error("Fetch navigation graph error:", error);

    res.status(500).json({
      message: "Failed to fetch navigation graph",
      error: error.message
    });
  }
});

// FIND THE SHORTEST VALID ROUTE
router.get("/:stationCode/route", async (req, res) => {
  try {
    const stationCode = req.params.stationCode.toUpperCase();

    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    const accessibleOnly = req.query.accessible === "true";

    // Validate required parameters.
    if (!from || !to) {
      return res.status(400).json({
        message: "Both 'from' and 'to' are required."
      });
    }

    // Load the station navigation graph.
    const nodes = await NavigationNode.find({ stationCode });
    const edges = await NavigationEdge.find({ stationCode });

    if (nodes.length === 0) {
      return res.status(404).json({
        message: `No navigation nodes found for station ${stationCode}.`
      });
    }

    // Confirm that both requested locations exist.
    const startNode = nodes.find(
      (node) => normalizeName(node.name) === normalizeName(from)
    );

    const destinationNode = nodes.find(
      (node) => normalizeName(node.name) === normalizeName(to)
    );

    if (!startNode || !destinationNode) {
      return res.status(404).json({
        message: "Starting location or destination was not found.",
        availableLocations: nodes.map((node) => node.name)
      });
    }

    if (getId(startNode) === getId(destinationNode)) {
      return res.json({
        stationCode,
        from: startNode.name,
        to: destinationNode.name,
        accessibleOnly,
        distance: 0,
        path: [startNode],
        activeObstacles: []
      });
    }

    // Only active obstacles can affect a newly calculated route.
    const obstacles = await Obstacle.find({
      stationCode,
      active: true
    });

    // Match obstacle locations to node names EXACTLY.
    // Partial matches are intentionally not used because they could
    // incorrectly block an entire platform or unrelated facility.
    const nodeByNormalizedName = new Map();

    for (const node of nodes) {
      const normalized = normalizeName(node.name);

      if (!nodeByNormalizedName.has(normalized)) {
        nodeByNormalizedName.set(normalized, []);
      }

      nodeByNormalizedName.get(normalized).push(node);
    }

    const blockedNodeIds = new Set();

    const obstacleDetails = obstacles.map((obstacle) => {
      const normalizedLocation = normalizeName(obstacle.location);
      const matches = nodeByNormalizedName.get(normalizedLocation) || [];

      // Only use an unambiguous exact match.
      const matchedNode = matches.length === 1 ? matches[0] : null;

      if (matchedNode) {
        blockedNodeIds.add(getId(matchedNode));
      }

      return {
        location: obstacle.location,
        type: obstacle.type,
        description: obstacle.description,
        affectsRouting: Boolean(matchedNode),
        matchedNavigationNode: matchedNode
          ? matchedNode.name
          : null
      };
    });

    // Do not calculate a route that starts or ends at a blocked node.
    if (blockedNodeIds.has(getId(startNode))) {
      return res.status(400).json({
        message: "Starting location is currently blocked.",
        activeObstacles: obstacleDetails
      });
    }

    if (blockedNodeIds.has(getId(destinationNode))) {
      return res.status(400).json({
        message: "Destination is currently blocked.",
        activeObstacles: obstacleDetails
      });
    }

    // Remove blocked nodes from the graph.
    const filteredNodes = nodes.filter(
      (node) => !blockedNodeIds.has(getId(node))
    );

    // Remove edges connected to blocked nodes.
    const filteredEdges = edges.filter((edge) => {
      const fromId = getId(edge.from);
      const toId = getId(edge.to);

      return (
        !blockedNodeIds.has(fromId) &&
        !blockedNodeIds.has(toId)
      );
    });

    // Find the shortest route using the existing Dijkstra service.
    // The service continues to enforce accessible-edge restrictions.
    const result = findShortestPath(
      filteredNodes,
      filteredEdges,
      startNode.name,
      destinationNode.name,
      accessibleOnly
    );

    if (!result) {
      return res.status(404).json({
        message:
          "No route found with the current accessibility and obstacle restrictions.",
        stationCode,
        from: startNode.name,
        to: destinationNode.name,
        accessibleOnly,
        activeObstacles: obstacleDetails
      });
    }

    return res.json({
      stationCode,
      from: startNode.name,
      to: destinationNode.name,
      accessibleOnly,
      distance: result.distance,
      path: result.path,
      activeObstacles: obstacleDetails
    });
  } catch (error) {
    console.error("Route calculation error:", error);

    return res.status(500).json({
      message: "Failed to calculate route.",
      error: error.message
    });
  }
});

module.exports = router;
