
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication token required"
    });
  }

  const token = authHeader.slice(7);

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      message: "Authentication is not configured"
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }

  if (!decoded.userId) {
    return res.status(401).json({
      message: "Invalid authentication token"
    });
  }

  try {
    const user = await User.findById(decoded.userId)
      .select("_id username email role");

    if (!user) {
      return res.status(401).json({
        message: "User account not found"
      });
    }

    // Trust the current database role, not the JWT role.
    req.user = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role
    };

    return next();

  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(500).json({
      message: "Failed to authenticate user"
    });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action"
      });
    }

    return next();
  };
}

module.exports = {
  authenticateToken,
  allowRoles
};
