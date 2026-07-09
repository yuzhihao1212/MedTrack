const express = require("express");
const pool = require("../config/mysql");
const { success, badRequest, error, serverError } = require("../utils/apiResponse");
const { requireFields } = require("../utils/validation");
const { createToken } = require("../utils/token");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const DEMO_PASSWORDS = {
  bme_admin01: "admin123",
  bme_manager01: "manager123",
  bme_engineer01: "engineer123",
  bme_analyst01: "analyst123"
};

function isValidDemoPassword(user, password) {
  return password === user.password_hash || password === DEMO_PASSWORDS[user.username];
}

router.post("/login", async (req, res) => {
  const missing = requireFields(req.body, ["username", "password"]);
  if (missing) return badRequest(res, missing);

  const { username, password } = req.body;

  try {
    const [rows] = await pool.query(
      `SELECT user_id, username, password_hash, role
       FROM users
       WHERE username = ?`,
      [username]
    );

    const user = rows[0];
    if (!user || !isValidDemoPassword(user, password)) {
      return error(res, 401, "Invalid username or password");
    }

    const token = createToken(user);

    success(res, {
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.role
      }
    }, "Login successful");
  } catch (err) {
    serverError(res, "Failed to login", err);
  }
});

router.get("/me", requireAuth, (req, res) => {
  success(res, { user: req.user });
});

module.exports = router;
