function createSuccessResponse(data = {}) {
  return { status: 'ok', ...data };
}

function createErrorResponse(code = 500, message = 'unable to process request') {
  return { status: 'error', error: { message, code } };
}

module.exports = { createSuccessResponse, createErrorResponse };
