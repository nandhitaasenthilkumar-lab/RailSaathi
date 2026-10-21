const mongoose = require("mongoose");

const navigationNodeSchema = new mongoose.Schema(
  {
    stationCode: {
      type: String,
      required: true
    },

    name: {
      type: String,
      required: true
    },

    type: {
      type: String,
      required: true,
      enum: [
        "entrance",
        "exit",
        "platform",
        "ramp",
        "elevator",
        "stairs",
        "ticket_counter",
        "restroom",
        "waiting_area",
        "junction"
      ]
    },

    location: {
      x: {
        type: Number,
        required: true
      },
      y: {
        type: Number,
        required: true
      }
    },

    accessible: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "NavigationNode",
  navigationNodeSchema
);