const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoose = require("mongoose");
require("dotenv").config();

const Station = require("./models/Station");

const stationData = {
  name: "Chennai Central",
  code: "MAS",

  entrances: [
    {
      name: "Main Entrance",
      type: "entrance",
      location: {
        x: 500,
        y: 100
      },
      accessible: true
    }
  ],

  platforms: [
    {
      name: "Platform 1",
      type: "platform",
      location: {
        x: 200,
        y: 500
      },
      accessible: true
    },
    {
      name: "Platform 2",
      type: "platform",
      location: {
        x: 300,
        y: 500
      },
      accessible: true
    },
    {
      name: "Platform 3",
      type: "platform",
      location: {
        x: 400,
        y: 500
      },
      accessible: true
    }
  ],

  facilities: [
  {
    name: "Wheelchair Ramp",
    type: "ramp",
    location: { x: 450, y: 180 },
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
    name: "Ticket Counter",
    type: "ticket_counter",
    location: { x: 400, y: 300 },
    accessible: true
  },

  {
    name: "Restroom",
    type: "restroom",
    location: { x: 650, y: 300 },
    accessible: true
  }
  ],

  exits: [
    {
      name: "Main Exit",
      type: "exit",
      location: {
        x: 500,
        y: 50
      },
      accessible: true
    }
  ]
};

async function seedStation() {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    await Station.deleteOne({
      code: "MAS"
    });

    const station = await Station.create(stationData);

    console.log("Station added successfully!");
    console.log(`${station.name} (${station.code})`);

    await mongoose.disconnect();

    console.log("MongoDB disconnected");
  } catch (error) {
    console.error("Seed failed:");
    console.error(error.message);

    process.exit(1);
  }
}

seedStation();