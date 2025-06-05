const path = require('path');

jest.mock('sqlite3', () => {
  const allMock = jest.fn((q, cb) => cb(null, []));
  const closeMock = jest.fn();
  const Database = jest.fn((path, mode, cb) => {
    if (cb) cb(null);
    return { all: allMock, close: closeMock };
  });
  return {
    verbose: () => ({ Database }),
    __mocks__: { Database, allMock, closeMock }
  };
});

const { __mocks__ } = require('sqlite3');
const dbConstructor = __mocks__.Database;

jest.mock('../config/database', () => ({ pool: { query: jest.fn() } }));

// Import the required modules
const { sanitizeDirectoryName, getMembership } = require('../services/searchService');

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
    expect(dbConstructor).not.toHaveBeenCalled();
  });

  it('opens sqlite3 database with sanitized path', async () => {
    await getMembership('validID');
    const expected = path.join(process.env.REPORTS_DIR, 'validID', 'data.db');
    expect(dbConstructor).toHaveBeenCalledWith(expected, undefined, expect.any(Function));
  });
});
