let defaultRateLimiter;

describe('uploadRouter events', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    ({ defaultRateLimiter } = require('../services/rateLimitMiddleware'));
  });

  afterEach(() => {
    const uploadRouter = require('../routes/uploadRouter');
    uploadRouter._stopClientCleanupTimer();
    uploadRouter._clients.clear();
    jest.useRealTimers();
  });

  test('events endpoint is protected by defaultRateLimiter', () => {
    const uploadRouter = require('../routes/uploadRouter');
    const layer = uploadRouter.stack.find(l => l.route && l.route.path === '/events');
    expect(layer).toBeDefined();
    const firstMiddleware = layer.route.stack[0].handle;
    expect(firstMiddleware).toBe(defaultRateLimiter);
  });

  test('cleanup timer removes inactive clients', () => {
    const uploadRouter = require('../routes/uploadRouter');
    const handler = uploadRouter.stack.find(l => l.route && l.route.path === '/events').route.stack[1].handle;
    const EventEmitter = require('events');
    const req = new EventEmitter();
    const res = new EventEmitter();
    res.setHeader = jest.fn();
    res.write = jest.fn();

    handler(req, res);

    expect(uploadRouter._clients.size).toBe(1);

    res.finished = true;

    jest.advanceTimersByTime(30000);

    expect(uploadRouter._clients.size).toBe(0);
  });
});
