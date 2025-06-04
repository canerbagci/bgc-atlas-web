const path = require('path');

jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    stderr: { on: jest.fn() },
    stdout: { on: jest.fn() },
    on: jest.fn((event, cb) => { if (event === 'close') cb(0); })
  }))
}));

// Import the required modules
const { sanitizeDirectoryName, getMembership } = require('../services/searchService');
const { spawn } = require('child_process');

describe('sanitizeDirectoryName', () => {
  it('allows valid names', () => {
    expect(sanitizeDirectoryName('abc123')).toBe('abc123');
    expect(sanitizeDirectoryName('A_B-c')).toBe('A_B-c');
  });

  it('rejects names with invalid characters', () => {
    expect(() => sanitizeDirectoryName('../evil')).toThrow();
    expect(() => sanitizeDirectoryName('some/evil')).toThrow();
    expect(() => sanitizeDirectoryName('bad..id')).toThrow();
  });
});

describe('getMembership', () => {
  // Save original environment variables
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set temporary environment variables before each test
    process.env.SEARCH_UPLOADS_DIR = '/tmp/uploads';
    process.env.REPORTS_DIR = '/tmp/reports';
  });

  afterEach(() => {
    // Restore original environment variables after each test
    process.env = { ...originalEnv };
  });

  it('rejects invalid report ids before spawning', async () => {
    await expect(getMembership('../evil')).rejects.toThrow();
    expect(spawn).not.toHaveBeenCalled();
  });

  it('spawns sqlite3 with sanitized path', async () => {
    await getMembership('validID');
    const expected = path.join(process.env.REPORTS_DIR, 'validID', 'data.db');
    expect(spawn).toHaveBeenCalledWith('sqlite3', [expected, expect.any(String)]);
  });
});
