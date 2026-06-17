//validate user input before sending to DBs
// check required body fields, route IDs, match allowed values, formats etc

const { ObjectId } = require("mongodb");

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => isBlank(body[field]));

  if (missing.length === 0) return null;

  return `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required`;
}

function isPositiveInteger(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function isNonNegativeNumber(value) {
  return value === null || value === undefined || (!Number.isNaN(Number(value)) && Number(value) >= 0);
}

function isDateString(value) {
  if (value === null || value === undefined || value === "") return true;

  return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) && !Number.isNaN(Date.parse(value));
}

function validatePositiveId(value, fieldName) {
  if (!isPositiveInteger(value)) {
    return `${fieldName} must be a positive integer`;
  }

  return null;
}

function validateField(value, fieldName, allowedValues) {
  if (!allowedValues.includes(value)) {
    return `${fieldName} must be one of: ${allowedValues.join(", ")}`;
  }

  return null;
}

function validateObjectId(id) {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === String(id);
}

module.exports = {
  isBlank,
  requireFields,
  isPositiveInteger,
  isNonNegativeNumber,
  isDateString,
  validatePositiveId,
  validateField,
  validateObjectId
};