const mongoose = require("mongoose");

const obstacleSchema = new mongoose.Schema(
  {
    stationCode: {
      type: String,
      required: true,
      uppercase: true
    },

    location: {
      type: String,
      required: true
    },

    type: {
      type: String,
      required: true,
      enum: [
        "blocked_path",
        "broken_elevator",
        "blocked_ramp",
        "blocked_stairs",
        "maintenance",
        "other"
      ]
    },

    description: {
      type: String,
      default: ""
    },

    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "Obstacle",
  obstacleSchema
);