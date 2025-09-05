function createErrorResponse(code, message) {
  return { status: 'error', error: { message, code } };
}

module.exports = { createErrorResponse };
