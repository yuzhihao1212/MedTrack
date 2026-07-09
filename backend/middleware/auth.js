const { verifyToken } = require("../utils/auth");
const { error } = require("../utils/apiResponse");

// Verifies the Bearer token and attaches { user_id, username, role } to req.user.
// Does not itself restrict by role — combine with authorize() for that.
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return error(res, 401, "Authentication required");
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return error(res, 401, "Invalid or expired token");
  }
}

// Must run after authenticate(). Rejects if req.user.role is not one of allowedRoles.
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 401, "Authentication required");
    }

    if (!allowedRoles.includes(req.user.role)) {
      return error(res, 403, `Requires role: ${allowedRoles.join(" or ")}`);
    }

    next();
  };
}

module.exports = { authenticate, authorize };
