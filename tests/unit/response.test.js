const { createSuccessResponse, createErrorResponse } = require('../../src/response');

describe('response helpers', () => {
  test('createSuccessResponse wraps object under status:ok', () => {
    const body = createSuccessResponse({ a: 1 });
    expect(body).toEqual({ status: 'ok', a: 1 });
  });

  test('createErrorResponse wraps error fields properly', () => {
    const body = createErrorResponse(404, 'not found');
    expect(body).toEqual({ status: 'error', error: { code: 404, message: 'not found' } });
  });
});
