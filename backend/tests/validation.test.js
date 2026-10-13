const test = require("node:test");
const assert = require("node:assert/strict");
const validation = require("../utils/validation");

test("required fields report blank and missing values", () => {
  assert.equal(validation.requireFields({ name: "  " }, ["name", "code"]), "name, code are required");
  assert.equal(validation.requireFields({ name: "Pump", code: "MD-1" }, ["name", "code"]), null);
});

test("positive IDs and numeric values are validated", () => {
  assert.equal(validation.validatePositiveId("3", "device_id"), null);
  assert.equal(validation.validatePositiveId("0", "device_id"), "device_id must be a positive integer");
  assert.equal(validation.validatePositiveId("1.5", "device_id"), "device_id must be a positive integer");
  assert.equal(validation.isNonNegativeNumber(0), true);
  assert.equal(validation.isNonNegativeNumber(-1), false);
});

test("dates, enum values and MongoDB IDs are checked", () => {
  assert.equal(validation.isDateString("2024-04-11"), true);
  assert.equal(validation.isDateString("11/04/2024"), false);
  assert.equal(validation.validateField("High", "risk_status", ["Low", "High"]), null);
  assert.equal(validation.validateField("Unknown", "risk_status", ["Low", "High"]),
    "risk_status must be one of: Low, High");
  assert.equal(validation.validateObjectId("507f1f77bcf86cd799439011"), true);
  assert.equal(validation.validateObjectId("not-an-object-id"), false);
});
