const { defaultRateLimiter } = require('../services/rateLimitMiddleware');

// Use fake timers to prevent the interval in uploadRouter from running
beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

test('events endpoint is protected by defaultRateLimiter', () => {
  const uploadRouter = require('../routes/uploadRouter');
  const layer = uploadRouter.stack.find(l => l.route && l.route.path === '/events');
  expect(layer).toBeDefined();
  const firstMiddleware = layer.route.stack[0].handle;
  expect(firstMiddleware).toBe(defaultRateLimiter);
});
