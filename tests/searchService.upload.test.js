const EventEmitter = require('events');
const fs = require('fs-extra');
const { spawn } = require('child_process');

jest.mock('fs-extra', () => ({
  ensureDirSync: jest.fn()
}));

jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

const { createTimestampedDirectory, processUploadedFiles } = require('../services/searchService');

process.env.SEARCH_UPLOADS_DIR = '/tmp/uploads';
process.env.SEARCH_SCRIPT_PATH = '/bin/echo';

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

describe('processUploadedFiles', () => {
  it('spawns search script and parses output', async () => {
    const stdout = new EventEmitter();
    const proc = new EventEmitter();
    proc.stdout = stdout;
    proc.stderr = new EventEmitter();
    spawn.mockReturnValue(proc);

    const req = {
      files: [{ originalname: 'f.txt', filename: 'f.txt', path: '/ceph/ibmi/tgm/bgc-atlas/search/uploads/f.txt' }],
      uploadDir: '/tmp/up'
    };
    const sendEvent = jest.fn();
    const promise = processUploadedFiles(req, sendEvent);

    stdout.emit('data', Buffer.from('gcf_membership\t0|1|2|3|4|5|bgc|123|0.9\n'));
    proc.emit('close', 0);

    const result = await promise;

    expect(spawn).toHaveBeenCalled();
    expect(sendEvent).toHaveBeenCalledWith({ status: 'Running' });
    expect(sendEvent).toHaveBeenLastCalledWith({ status: 'Complete', records: result });
    expect(result).toEqual([{ bgc_name: 'bgc', gcf_id: '123', membership_value: '0.9' }]);
  });
});
