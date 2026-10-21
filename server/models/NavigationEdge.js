const mongoose = require("mongoose");

const navigationEdgeSchema = new mongoose.Schema(
  {
    stationCode: {
      type: String,
      required: true
    },

    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NavigationNode",
      required: true
    },

    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NavigationNode",
      required: true
    },

    distance: {
      type: Number,
      required: true
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
  "NavigationEdge",
  navigationEdgeSchema
);