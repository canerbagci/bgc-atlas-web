describe('database config environment validation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  it('throws when required env vars are missing', () => {
    process.env = { ...originalEnv };
    delete process.env.DB_USER;
    delete process.env.DB_HOST;
    delete process.env.DB_DATABASE;
    delete process.env.DB_PASSWORD;

    jest.mock('pg', () => ({ Pool: jest.fn(() => ({})) }));
    expect(() => require('../config/database')).toThrow('Missing required database environment variable');
  });

  it('does not throw when all env vars are set', () => {
    process.env = { ...originalEnv, DB_USER: 'u', DB_HOST: 'h', DB_DATABASE: 'd', DB_PASSWORD: 'p' };
    jest.mock('pg', () => ({ Pool: jest.fn(() => ({})) }));
    expect(() => require('../config/database')).not.toThrow();
  });
});
