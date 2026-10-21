
const dns = require("dns");

// RailSaathi's MongoDB Atlas DNS workaround
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

dotenv.config();

async function createStaff() {
  const {
    STAFF_USERNAME,
    STAFF_EMAIL,
    STAFF_PASSWORD
  } = process.env;

  if (!STAFF_USERNAME || !STAFF_EMAIL || !STAFF_PASSWORD) {
    throw new Error("Staff account details are missing.");
  }

  const username = STAFF_USERNAME.trim();
  const email = STAFF_EMAIL.trim().toLowerCase();

  if (username.length < 3 || username.length > 30) {
    throw new Error("Username must be 3–30 characters.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please provide a valid email address.");
  }

  if (STAFF_PASSWORD.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from .env.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  console.log("MongoDB connected successfully.");

  const existingByUsername = await User.findOne({
  username
}).select("username email role");

const existingByEmail = await User.findOne({
  email
}).select("username email role");

if (existingByUsername || existingByEmail) {
  console.log("An existing account was found.");

  if (existingByUsername) {
    console.log("Username match:", existingByUsername.username);
    console.log("Role:", existingByUsername.role);
  }

  if (
    existingByEmail &&
    (!existingByUsername ||
      !existingByEmail._id.equals(existingByUsername._id))
  ) {
    console.log("Email match:", existingByEmail.email);
    console.log("Role:", existingByEmail.role);
  }

  console.log("No account was changed.");
  return;
}

  const hashedPassword = await bcrypt.hash(STAFF_PASSWORD, 12);

  await User.create({
    username,
    email,
    password: hashedPassword,
    role: "staff"
  });

  console.log("Staff account created successfully.");
  console.log(`Username: ${username}`);
  console.log("Role: staff");
}

createStaff()
  .catch((error) => {
    console.error(
      "Staff account creation failed:",
      error.message
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
