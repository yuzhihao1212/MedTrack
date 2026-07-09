const crypto = require("crypto");

const AUTH_SECRET = process.env.AUTH_SECRET || "medtrack-dev-secret";

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function sign(data) {
  return crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(data)
    .digest("base64url");
}

function createToken(user, expiresInSeconds = 60 * 60 * 8) {
  const header = base64UrlEncode({ alg: "HS256", typ: "JWT" });
  const payload = base64UrlEncode({
    user_id: user.user_id,
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds
  });
  const signature = sign(`${header}.${payload}`);
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSignature = sign(`${header}.${payload}`);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    const data = base64UrlDecode(payload);
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return data;
  } catch (_err) {
    return null;
  }
}

module.exports = { createToken, verifyToken };
