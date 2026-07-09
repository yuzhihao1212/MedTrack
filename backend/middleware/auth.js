const { error } = require("../utils/apiResponse");
const { verifyToken } = require("../utils/token");

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme === "Bearer" && token) {
    const user = verifyToken(token);
    if (user) req.user = user;
  }

  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return error(res, 401, "Authentication required");
  }

  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 401, "Authentication required");
    }

    if (!allowedRoles.includes(req.user.role)) {
      return error(res, 403, "Insufficient role permission");
    }

    next();
  };
}

module.exports = { optionalAuth, requireAuth, requireRole };
