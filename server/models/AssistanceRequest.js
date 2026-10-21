const mongoose = require("mongoose");

const assistanceRequestSchema = new mongoose.Schema(
  {
    stationCode: {
      type: String,
      required: true,
      uppercase: true
    },

    assistanceType: {
      type: String,
      required: true,
      enum: [
        "wheelchair",
        "porter",
        "staff"
      ]
    },

    location: {
      type: String,
      required: true
    },

    description: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "completed",
        "cancelled"
      ],
      default: "pending"
    }
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.model(
    "AssistanceRequest",
    assistanceRequestSchema
  );