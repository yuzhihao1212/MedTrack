const test = require("node:test");
const assert = require("node:assert/strict");
const response = require("../utils/apiResponse");

function mockResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test("success and created keep the documented response shape", () => {
  const ok = mockResponse();
  response.success(ok, { id: 1 });
  assert.equal(ok.statusCode, 200);
  assert.deepEqual(ok.body, { success: true, data: { id: 1 } });

  const made = mockResponse();
  response.created(made, { id: 2 }, "Device created");
  assert.equal(made.statusCode, 201);
  assert.deepEqual(made.body, { success: true, message: "Device created", data: { id: 2 } });
});

test("error helpers set status and hide details in production", () => {
  const bad = mockResponse();
  response.badRequest(bad, "Missing device_code");
  assert.equal(bad.statusCode, 400);
  assert.deepEqual(bad.body, { success: false, message: "Missing device_code" });

  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    const failed = mockResponse();
    response.serverError(failed, "Failed to load", new Error("database password details"));
    assert.equal(failed.statusCode, 500);
    assert.deepEqual(failed.body, { success: false, message: "Failed to load" });
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
