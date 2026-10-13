const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET ||= "medtrack-test-secret-not-for-runtime";
const auth = require("../utils/auth");

test("password hashes verify the right password only", async () => {
  const hash = await auth.hashPassword("test-password");
  assert.notEqual(hash, "test-password");
  assert.equal(await auth.verifyPassword("test-password", hash), true);
  assert.equal(await auth.verifyPassword("wrong-password", hash), false);
});

test("signed JWTs carry the expected identity and reject tampering", () => {
  const user = { user_id: 7, username: "unit_admin", role: "bme_admin" };
  const token = auth.signToken(user);
  assert.deepEqual(
    (({ user_id, username, role }) => ({ user_id, username, role }))(auth.verifyToken(token)),
    user
  );
  assert.throws(() => auth.verifyToken(`${token}tampered`));
});
