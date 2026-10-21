const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoose = require("mongoose");
require("dotenv").config();

const NavigationNode = require("./models/NavigationNode");
const NavigationEdge = require("./models/NavigationEdge");


// ==========================================
// NAVIGATION NODES
// ==========================================

const nodes = [

  {
    name: "Main Entrance",
    type: "entrance",
    location: { x: 500, y: 100 },
    accessible: true
  },

  {
    name: "Wheelchair Ramp",
    type: "ramp",
    location: { x: 450, y: 180 },
    accessible: true
  },

  {
    name: "Ticket Counter",
    type: "ticket_counter",
    location: { x: 400, y: 300 },
    accessible: true
  },

  {
    name: "Platform 1",
    type: "platform",
    location: { x: 200, y: 500 },
    accessible: true
  },

  {
    name: "Platform 2",
    type: "platform",
    location: { x: 300, y: 500 },
    accessible: true
  },

  {
    name: "Platform 3",
    type: "platform",
    location: { x: 400, y: 500 },
    accessible: true
  },

  {
    name: "Main Stairway",
    type: "stairs",
    location: { x: 550, y: 250 },
    accessible: false
  },

  {
    name: "Stair Junction",
    type: "junction",
    location: { x: 550, y: 400 },
    accessible: false
  },

  {
    name: "Accessible Corridor",
    type: "junction",
    location: { x: 700, y: 400 },
    accessible: true
  },

  {
    name: "Restroom",
    type: "restroom",
    location: { x: 650, y: 300 },
    accessible: true
  },

  {
    name: "Main Exit",
    type: "exit",
    location: { x: 500, y: 50 },
    accessible: true
  }

];


// ==========================================
// ADD BIDIRECTIONAL CONNECTION
// ==========================================

function addConnection(
  connections,
  from,
  to,
  distance,
  accessible
) {

  connections.push([
    from,
    to,
    distance,
    accessible
  ]);

  connections.push([
    to,
    from,
    distance,
    accessible
  ]);

}


// ==========================================
// SEED NAVIGATION
// ==========================================

async function seedNavigation() {

  try {

    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");


    // ==========================================
    // DELETE OLD GRAPH
    // ==========================================

    await NavigationEdge.deleteMany({
      stationCode: "MAS"
    });

    await NavigationNode.deleteMany({
      stationCode: "MAS"
    });


    // ==========================================
    // CREATE NODES
    // ==========================================

    const nodesWithStation =
      nodes.map((node) => ({
        ...node,
        stationCode: "MAS"
      }));


    const createdNodes =
      await NavigationNode.insertMany(
        nodesWithStation
      );

    console.log(
      `${createdNodes.length} navigation nodes created`
    );


    // ==========================================
    // FIND NODE
    // ==========================================

    const getNode = (name) => {

      const node =
        createdNodes.find(
          (node) => node.name === name
        );

      if (!node) {
        throw new Error(
          `Node not found: ${name}`
        );
      }

      return node;
    };


    // ==========================================
    // CONNECTIONS
    // ==========================================

    const connections = [];


    // ==========================================
    // PRIMARY ACCESSIBLE ROUTE
    // ==========================================

    addConnection(
      connections,
      "Main Entrance",
      "Wheelchair Ramp",
      90,
      true
    );

    addConnection(
      connections,
      "Wheelchair Ramp",
      "Ticket Counter",
      130,
      true
    );

    addConnection(
      connections,
      "Ticket Counter",
      "Platform 1",
      260,
      true
    );

    addConnection(
      connections,
      "Ticket Counter",
      "Platform 2",
      220,
      true
    );

    addConnection(
      connections,
      "Platform 2",
      "Platform 3",
      100,
      true
    );


    // ==========================================
    // STAIR ROUTE
    // ==========================================

    addConnection(
      connections,
      "Main Entrance",
      "Main Stairway",
      70,
      false
    );

    addConnection(
      connections,
      "Main Stairway",
      "Stair Junction",
      150,
      false
    );

    addConnection(
      connections,
      "Stair Junction",
      "Platform 3",
      80,
      false
    );


    // ==========================================
    // SECOND ACCESSIBLE ROUTE
    // ==========================================

    // Total = 250 + 350 = 600
    // This is intentionally longer than
    // the primary accessible route (540).

    addConnection(
      connections,
      "Main Entrance",
      "Accessible Corridor",
      250,
      true
    );

    addConnection(
      connections,
      "Accessible Corridor",
      "Platform 3",
      350,
      true
    );


    // ==========================================
    // RESTROOM
    // ==========================================

    addConnection(
      connections,
      "Accessible Corridor",
      "Restroom",
      120,
      true
    );


    // ==========================================
    // MAIN EXIT
    // ==========================================

    addConnection(
      connections,
      "Main Entrance",
      "Main Exit",
      50,
      true
    );


    // ==========================================
    // CREATE EDGES
    // ==========================================

    const edges =
      connections.map(
        ([
          fromName,
          toName,
          distance,
          accessible
        ]) => ({

          stationCode: "MAS",

          from:
            getNode(fromName)._id,

          to:
            getNode(toName)._id,

          distance,

          accessible

        })
      );


    await NavigationEdge.insertMany(
      edges
    );


    console.log(
      `${edges.length} navigation edges created`
    );

    console.log(
      "Navigation graph created successfully!"
    );


    await mongoose.disconnect();

    console.log(
      "MongoDB disconnected"
    );

  } catch (error) {

    console.error(
      "Navigation seed failed:"
    );

    console.error(
      error.message
    );

    process.exit(1);
  }

}

seedNavigation();