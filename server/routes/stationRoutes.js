const express = require("express");
const mongoose = require("mongoose");
const Station = require("../models/Station");

const router = express.Router();


// ==========================================
// GET ALL STATIONS
// ==========================================

router.get("/", async (req, res) => {

  try {

    const stations = await Station.find();

    res.json(stations);

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch stations",
      error: error.message
    });

  }

});


// ==========================================
// GET STATION BY CODE
// Example: /api/stations/MAS
// ==========================================

router.get("/code/:code", async (req, res) => {

  try {

    const stationCode =
      req.params.code.toUpperCase();

    const station =
      await Station.findOne({
        code: stationCode
      });

    if (!station) {

      return res.status(404).json({
        message: "Station not found"
      });

    }

    res.json(station);

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch station",
      error: error.message
    });

  }

});


// ==========================================
// GET STATION BY MONGODB ID
// Example: /api/stations/68abc123...
// ==========================================

router.get("/:id", async (req, res) => {

  try {

    const id = req.params.id;


    // Check whether the supplied value
    // is actually a valid MongoDB ObjectId.

    if (!mongoose.Types.ObjectId.isValid(id)) {

      return res.status(400).json({
        message: "Invalid station ID"
      });

    }


    const station =
      await Station.findById(id);


    if (!station) {

      return res.status(404).json({
        message: "Station not found"
      });

    }


    res.json(station);

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch station",
      error: error.message
    });

  }

});


module.exports = router;