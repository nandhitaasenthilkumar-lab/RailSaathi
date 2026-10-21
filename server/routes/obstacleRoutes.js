
const express = require("express");
const mongoose = require("mongoose");

const Obstacle = require("../models/Obstacle");
const {
  authenticateToken,
  allowRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// GET ACTIVE OBSTACLES
// Public: passengers need to see hazards
// ==========================================

router.get("/:stationCode", async (req, res) => {
  try {
    const stationCode = req.params.stationCode
      .trim()
      .toUpperCase();

    const obstacles = await Obstacle.find({
      stationCode,
      active: true
    }).sort({ createdAt: -1 });

    return res.json(obstacles);
  } catch (error) {
    console.error("Failed to fetch obstacles:", error.message);

    return res.status(500).json({
      message: "Failed to fetch obstacles"
    });
  }
});

// ==========================================
// REPORT NEW OBSTACLE
// Logged-in passengers and staff
// ==========================================

router.post(
  "/",
  authenticateToken,
  allowRoles("passenger", "staff", "admin"),
  async (req, res) => {
    try {
      const {
        stationCode,
        location,
        type,
        description
      } = req.body;

      if (
        typeof stationCode !== "string" ||
        !stationCode.trim() ||
        typeof location !== "string" ||
        !location.trim() ||
        typeof type !== "string" ||
        !type.trim()
      ) {
        return res.status(400).json({
          message:
            "stationCode, location and type are required"
        });
      }

      const obstacle = await Obstacle.create({
        stationCode: stationCode.trim().toUpperCase(),
        location: location.trim(),
        type: type.trim(),
        description:
          typeof description === "string"
            ? description.trim()
            : ""
      });

      return res.status(201).json(obstacle);
    } catch (error) {
      console.error("Failed to create obstacle:", error.message);

      return res.status(400).json({
        message: "Failed to create obstacle"
      });
    }
  }
);

// ==========================================
// RESOLVE OBSTACLE
// Staff and admin only
// ==========================================

router.patch(
  "/:id/resolve",
  authenticateToken,
  allowRoles("staff", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid obstacle ID"
        });
      }

      const obstacle = await Obstacle.findByIdAndUpdate(
        id,
        { active: false },
        { new: true, runValidators: true }
      );

      if (!obstacle) {
        return res.status(404).json({
          message: "Obstacle not found"
        });
      }

      return res.json({
        message: "Obstacle resolved successfully",
        obstacle
      });
    } catch (error) {
      console.error("Failed to resolve obstacle:", error.message);

      return res.status(500).json({
        message: "Failed to resolve obstacle"
      });
    }
  }
);

module.exports = router;
