
const express = require("express");

const AssistanceRequest = require("../models/AssistanceRequest");

const {
  authenticateToken,
  allowRoles
} = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// GET ALL ACTIVE ASSISTANCE REQUESTS
// STAFF ONLY
// ==========================================

router.get(
  "/:stationCode",
  authenticateToken,
  allowRoles("staff"),
  async (req, res) => {
    try {
      const stationCode =
        req.params.stationCode.toUpperCase();

      const requests = await AssistanceRequest.find({
        stationCode,
        status: {
          $in: ["pending", "accepted"]
        }
      }).sort({
        createdAt: -1
      });

      return res.json(requests);

    } catch (error) {
      console.error(
        "Fetch assistance requests error:",
        error
      );

      return res.status(500).json({
        message: "Failed to fetch assistance requests"
      });
    }
  }
);


// ==========================================
// CREATE ASSISTANCE REQUEST
// AUTHENTICATED PASSENGERS ONLY
// ==========================================

router.post(
  "/",
  authenticateToken,
  allowRoles("passenger"),
  async (req, res) => {
    try {
      const {
        stationCode,
        assistanceType,
        location,
        description
      } = req.body;

      if (
        !stationCode ||
        typeof stationCode !== "string" ||
        !assistanceType ||
        typeof assistanceType !== "string" ||
        !location ||
        typeof location !== "string"
      ) {
        return res.status(400).json({
          message:
            "Valid stationCode, assistanceType and location are required"
        });
      }

      const request = await AssistanceRequest.create({
        stationCode: stationCode.trim().toUpperCase(),
        assistanceType: assistanceType.trim(),
        location: location.trim(),
        description:
          typeof description === "string"
            ? description.trim()
            : ""
      });

      return res.status(201).json(request);

    } catch (error) {
      console.error(
        "Create assistance request error:",
        error
      );

      return res.status(400).json({
        message: "Failed to create assistance request"
      });
    }
  }
);


// ==========================================
// UPDATE REQUEST STATUS
// STAFF ONLY
// ==========================================

router.patch(
  "/:id/status",
  authenticateToken,
  allowRoles("staff"),
  async (req, res) => {
    try {
      const { status } = req.body;

      const allowedStatuses = [
        "pending",
        "accepted",
        "completed",
        "cancelled"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid assistance request status"
        });
      }

      // Validate MongoDB document ID
      if (!/^[a-fA-F0-9]{24}$/.test(req.params.id)) {
        return res.status(400).json({
          message: "Invalid assistance request ID"
        });
      }

      const request = await AssistanceRequest.findByIdAndUpdate(
        req.params.id,
        { status },
        {
          new: true,
          runValidators: true
        }
      );

      if (!request) {
        return res.status(404).json({
          message: "Assistance request not found"
        });
      }

      return res.json(request);

    } catch (error) {
      console.error(
        "Update assistance request error:",
        error
      );

      return res.status(500).json({
        message: "Failed to update assistance request"
      });
    }
  }
);


module.exports = router;
