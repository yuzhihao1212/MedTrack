//keep api responses consistent

function success(res, data, message = null, status = 200) {
  const body = { success: true };

  if (message) body.message = message;
  if (data !== undefined) body.data = data;

  return res.status(status).json(body);
}

function created(res, data, message = "Created") {
  return success(res, data, message, 201);
}

function error(res, status, message, details = null) {
  const body = { success: false, message };

  if (details && process.env.NODE_ENV !== "production") {
    body.details = details;
  }

  return res.status(status).json(body);
}

function badRequest(res, message, details = null) {
  return error(res, 400, message, details);
}

function notFound(res, message = "Resource not found") {
  return error(res, 404, message);
}

function conflict(res, message, details = null) {
  return error(res, 409, message, details);
}

function serverError(res, message = "Internal server error", err = null) {
  return error(res, 500, message, err?.message);
}

module.exports = {
  success,
  created,
  error,
  badRequest,
  notFound,
  conflict,
  serverError
};