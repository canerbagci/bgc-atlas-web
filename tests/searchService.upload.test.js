const EventEmitter = require('events');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
jest.mock('../config/database', () => ({ pool: { query: jest.fn() } }));
const jobService = require('../services/jobService');

jest.mock('fs-extra', () => {
  const original = jest.requireActual('fs-extra');
  return {
    ...original,
    ensureDirSync: jest.fn(),
    existsSync: jest.fn()
  };
});

jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

// Set script path for tests
process.env.SEARCH_SCRIPT_PATH = '/tmp/search/script.sh';

// Import the required modules
const { createTimestampedDirectory, processUploadedFiles, validateUploadedFiles } = require('../services/searchService');

describe('createTimestampedDirectory', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1234567890000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a timestamped directory', () => {
    const dir = createTimestampedDirectory('/base');
    expect(fs.ensureDirSync).toHaveBeenCalledWith('/base/1234567890000');
    expect(dir).toBe('/base/1234567890000');
  });
});

describe('validateUploadedFiles', () => {
  it('passes for valid GenBank content', async () => {
    const tmpDir = fs.mkdtempSync('/tmp/gbk-');
    const filePath = path.join(tmpDir, 'test.gbk');
    fs.writeFileSync(filePath, 'LOCUS       TEST');
    await expect(validateUploadedFiles([{ path: filePath }])).resolves.toBeUndefined();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws for invalid content', async () => {
    const tmpDir = fs.mkdtempSync('/tmp/gbk-');
    const filePath = path.join(tmpDir, 'bad.gbk');
    fs.writeFileSync(filePath, 'INVALID');
    await expect(validateUploadedFiles([{ path: filePath }])).rejects.toThrow('Invalid GenBank file format');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('processUploadedFiles', () => {
  // Save original environment variables
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set temporary environment variables before each test
    process.env.SEARCH_UPLOADS_DIR = '/tmp/uploads';
    process.env.REPORTS_DIR = '/tmp/reports';
    fs.existsSync.mockReturnValue(true);
  });

  afterEach(() => {
    // Restore original environment variables after each test
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  it('spawns search script and parses output', async () => {
    const stdout = new EventEmitter();
    const proc = new EventEmitter();
    proc.stdout = stdout;
    proc.stderr = new EventEmitter();
    spawn.mockReturnValue(proc);

    const tmpDir = fs.mkdtempSync('/tmp/gbk-');
    const filePath = path.join(tmpDir, 'f.txt');
    fs.writeFileSync(filePath, 'LOCUS TEST');
    const req = {
      files: [{ originalname: 'f.txt', filename: 'f.txt', path: filePath }],
      uploadDir: '/tmp/up',
      ip: '1.2.3.4',
      headers: {}
    };
    const createJobSpy = jest.spyOn(jobService, 'createJob');
    const sendEvent = jest.fn();
    const promise = processUploadedFiles(req, sendEvent);

    stdout.emit('data', Buffer.from('gcf_membership\t0|1|2|3|4|5|bgc|123|0.9\n'));
    proc.emit('close', 0);

    const result = await promise;

    fs.rmSync(tmpDir, { recursive: true, force: true });

    expect(createJobSpy).toHaveBeenCalledWith('1.2.3.4', '/tmp/up', 1, ['f.txt']);
    expect(spawn).toHaveBeenCalledWith('/tmp/search/script.sh', ['/tmp/up'], { shell: false });
    expect(sendEvent).toHaveBeenCalledWith({ status: 'Running' });
    expect(sendEvent).toHaveBeenLastCalledWith({ status: 'completed', records: result });
    expect(result).toEqual([{ bgc_name: 'bgc', gcf_id: '123', membership_value: '0.9' }]);
  });

  it('uses first IP from x-forwarded-for header', async () => {
    const stdout = new EventEmitter();
    const proc = new EventEmitter();
    proc.stdout = stdout;
    proc.stderr = new EventEmitter();
    spawn.mockReturnValue(proc);

    const tmpDir = fs.mkdtempSync('/tmp/gbk-');
    const filePath = path.join(tmpDir, 'f.txt');
    fs.writeFileSync(filePath, 'LOCUS TEST');
    const req = {
      files: [{ originalname: 'f.txt', filename: 'f.txt', path: filePath }],
      uploadDir: '/tmp/up',
      headers: { 'x-forwarded-for': '5.5.5.5, 6.6.6.6' }
    };
    const createJobSpy = jest.spyOn(jobService, 'createJob');
    const sendEvent = jest.fn();
    const promise = processUploadedFiles(req, sendEvent);

    stdout.emit('data', Buffer.from('gcf_membership\t0|1|2|3|4|5|bgc|123|0.9\n'));
    proc.emit('close', 0);

    await promise;

    fs.rmSync(tmpDir, { recursive: true, force: true });

    expect(createJobSpy).toHaveBeenCalledWith('5.5.5.5', '/tmp/up', 1, ['f.txt']);
  });
});
