const mongoose = require("mongoose");

const facilitySchema = new mongoose.Schema({
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
  "junction",
  "other"
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
});

const stationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    code: {
      type: String,
      required: true,
      unique: true
    },

    entrances: [facilitySchema],

    platforms: [facilitySchema],

    facilities: [facilitySchema],

    exits: [facilitySchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Station", stationSchema);