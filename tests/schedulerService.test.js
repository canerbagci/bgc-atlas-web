const EventEmitter = require('events');

const mockQueue = {
  add: jest.fn(() => Promise.resolve()),
  getWaiting: jest.fn(() => Promise.resolve([])),
  getActive: jest.fn(() => Promise.resolve([])),
  getJob: jest.fn(() => Promise.resolve(null)),
  close: jest.fn(() => Promise.resolve()),
  process: jest.fn()
};

jest.mock('bull', () => jest.fn().mockImplementation(() => mockQueue));

const originalEnv = process.env.NODE_ENV;
let schedulerService;

beforeEach(() => {
  jest.resetModules();
  process.env.NODE_ENV = 'development';
  schedulerService = require('../services/schedulerService');
});

afterAll(() => {
  process.env.NODE_ENV = originalEnv;
});

describe('schedulerService.scheduleJob', () => {
  it('adds job to queue and emits queued status', async () => {
    const emitter = new EventEmitter();
    jest.spyOn(emitter, 'emit');
    mockQueue.getWaiting.mockResolvedValueOnce([{ data: { jobId: 'job1' } }]);

    await schedulerService.scheduleJob('job1', emitter);

    expect(mockQueue.add).toHaveBeenCalledWith({ jobId: 'job1' }, { jobId: 'job1' });
    expect(emitter.emit).toHaveBeenCalledWith('status', {
      status: 'Queued',
      jobId: 'job1',
      queuePosition: 1,
      totalJobs: 1
    });
  });
});

describe('schedulerService.getQueueInfo', () => {
  it('returns queue information for a job', async () => {
    mockQueue.getWaiting.mockResolvedValueOnce([
      { data: { jobId: 'other' } },
      { data: { jobId: 'job2' } }
    ]);
    mockQueue.getActive.mockResolvedValueOnce([]);

    const info = await schedulerService.getQueueInfo('job2');

    expect(info).toEqual({
      queuePosition: 2,
      totalJobs: 2,
      isQueued: true,
      isRunning: false
    });
  });
});

describe('schedulerService.getQueuedJobs', () => {
  it('lists queued job IDs', async () => {
    mockQueue.getWaiting.mockResolvedValueOnce([
      { data: { jobId: 'a' } },
      { data: { jobId: 'b' } }
    ]);

    const jobs = await schedulerService.getQueuedJobs();

    expect(jobs).toEqual(['a', 'b']);
  });
});
