const express = require("express");
const pool = require("../config/mysql");
const { success, badRequest, error } = require("../utils/apiResponse");
const { requireFields } = require("../utils/validation");
const { verifyPassword, signToken } = require("../utils/auth");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const missing = requireFields(req.body, ["username", "password"]);
  if (missing) {
    return badRequest(res, missing);
  }

  try {
    const [rows] = await pool.query(
      `SELECT user_id, username, password_hash, role FROM users WHERE username = ?`,
      [username]
    );

    const user = rows[0];
    const passwordMatches = user ? await verifyPassword(password, user.password_hash) : false;

    if (!user || !passwordMatches) {
      return error(res, 401, "Invalid username or password");
    }

    const token = signToken(user);

    success(res, {
      token,
      user: { user_id: user.user_id, username: user.username, role: user.role }
    }, "Login successful");
  } catch (err) {
    error(res, 500, "Failed to log in", err.message);
  }
});

// GET /api/auth/me
router.get("/me", authenticate, (req, res) => {
  success(res, req.user);
});

module.exports = router;
