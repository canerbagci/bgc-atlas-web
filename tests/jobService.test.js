jest.mock('../config/database', () => ({
  pool: { query: jest.fn() }
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-job-id')
}));

const { pool } = require('../config/database');
const jobService = require('../services/jobService');

const originalEnv = process.env.NODE_ENV;

beforeAll(() => {
  process.env.NODE_ENV = 'development';
});

afterAll(() => {
  process.env.NODE_ENV = originalEnv;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('jobService.createJob', () => {
  it('inserts a new job and returns its id', async () => {
    pool.query.mockResolvedValue({});

    const id = await jobService.createJob('user1', '/tmp/up', 2, ['a', 'b']);

    expect(id).toBe('mock-job-id');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO search_jobs'),
      ['mock-job-id', 'user1', 'queued', '/tmp/up', 2, ['a', 'b']]
    );
  });
});

describe('jobService.updateJobStatus', () => {
  it('updates status in the database', async () => {
    pool.query.mockResolvedValue({});

    await jobService.updateJobStatus('job1', 'running');

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE search_jobs'),
      ['running', 'job1']
    );
  });
});
