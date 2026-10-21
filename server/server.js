
const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const stationRoutes = require("./routes/stationRoutes");
const navigationRoutes = require("./routes/navigationRoutes");
const obstacleRoutes = require("./routes/obstacleRoutes");
const assistanceRoutes = require("./routes/assistanceRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/stations", stationRoutes);
app.use("/api/navigation", navigationRoutes);
app.use("/api/obstacles", obstacleRoutes);
app.use("/api/assistance", assistanceRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "RailSaathi API is running"
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`RailSaathi server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:");
    console.error(error.message);
  });
