const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET ||= "medtrack-test-secret-not-for-runtime";
const { signToken } = require("../utils/auth");
const { authenticate, authorize } = require("../middleware/auth");

function mockResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test("missing and invalid bearer tokens are rejected", () => {
  for (const authorization of [undefined, "Bearer invalid-token"]) {
    const req = { headers: { authorization } };
    const res = mockResponse();
    let nextCalled = false;
    authenticate(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
  }
});

test("valid token passes authentication and attaches identity", () => {
  const user = { user_id: 2, username: "engineer", role: "bme_engineer" };
  const req = { headers: { authorization: `Bearer ${signToken(user)}` } };
  const res = mockResponse();
  let nextCalled = false;
  authenticate(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.user.role, user.role);
});

test("authorization rejects the wrong role and accepts the right one", () => {
  const denied = mockResponse();
  authorize("bme_admin")({ user: { role: "bme_analyst" } }, denied, () => {
    assert.fail("analyst should not pass admin authorization");
  });
  assert.equal(denied.statusCode, 403);

  const accepted = mockResponse();
  let nextCalled = false;
  authorize("bme_admin")({ user: { role: "bme_admin" } }, accepted, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(accepted.statusCode, null);
});
