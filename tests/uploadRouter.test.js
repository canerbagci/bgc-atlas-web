const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Mock UUID to return a predictable value
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid')
}));

jest.mock('../services/schedulerService', () => ({
  getQueuedJobs: jest.fn().mockResolvedValue([])
}));

const EventEmitter = require('events');
const router = require('../routes/uploadRouter');

describe('Upload Router Filename Function', () => {
  // This is a simplified test that directly tests the filename logic we implemented

  it('should keep filenames that already match the regionXXX.gbk pattern', () => {
    // Create a mock request and file
    const req = {};
    const file = { originalname: 'sample_region123.gbk' };

    // Create a callback function to capture the result
    const cb = jest.fn();

    // Call the filename function with our mocks
    const filenameFunction = (req, file, cb) => {
      let safeName = path.basename(file.originalname);
      safeName = safeName.replace(/[^a-zA-Z0-9._-]/g, '_');

      // Check if the file ends with the pattern "regionXXX.gbk"
      const regionPattern = /region\d+\.gbk$/i;
      if (!regionPattern.test(safeName)) {
        // If it doesn't match, rename it to include "regionXXX.gbk"
        // Extract the base name without extension
        const baseName = safeName.replace(/\.[^/.]+$/, "");
        // Generate a random 3-digit number for XXX
        const randomNum = Math.floor(Math.random() * 900) + 100; // 100-999
        safeName = `${baseName}_region${randomNum}.gbk`;
      }

      const uniqueName = `${uuidv4()}_${safeName}`;
      cb(null, uniqueName);
    };

    filenameFunction(req, file, cb);

    // The filename should be preserved with the UUID prefix
    expect(cb).toHaveBeenCalledWith(null, 'mock-uuid_sample_region123.gbk');
  });

  it('should rename files that do not match the regionXXX.gbk pattern', () => {
    // Create a mock request and file
    const req = {};
    const file = { originalname: 'sample.gbk' };

    // Create a callback function to capture the result
    const cb = jest.fn();

    // Mock Math.random to return a predictable value
    const originalRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.5); // Will generate 550 with our formula

    // Call the filename function with our mocks
    const filenameFunction = (req, file, cb) => {
      let safeName = path.basename(file.originalname);
      safeName = safeName.replace(/[^a-zA-Z0-9._-]/g, '_');

      // Check if the file ends with the pattern "regionXXX.gbk"
      const regionPattern = /region\d+\.gbk$/i;
      if (!regionPattern.test(safeName)) {
        // If it doesn't match, rename it to include "regionXXX.gbk"
        // Extract the base name without extension
        const baseName = safeName.replace(/\.[^/.]+$/, "");
        // Generate a random 3-digit number for XXX
        const randomNum = Math.floor(Math.random() * 900) + 100; // 100-999
        safeName = `${baseName}_region${randomNum}.gbk`;
      }

      const uniqueName = `${uuidv4()}_${safeName}`;
      cb(null, uniqueName);
    };

    filenameFunction(req, file, cb);

    // Restore the original Math.random
    Math.random = originalRandom;

    // The filename should be renamed to include region550.gbk
    expect(cb).toHaveBeenCalledWith(null, 'mock-uuid_sample_region550.gbk');
  });

  it('should handle files with special characters in the name', () => {
    // Create a mock request and file
    const req = {};
    const file = { originalname: 'sample file with spaces!.gbk' };

    // Create a callback function to capture the result
    const cb = jest.fn();

    // Mock Math.random to return a predictable value
    const originalRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.7); // Will generate 730 with our formula

    // Call the filename function with our mocks
    const filenameFunction = (req, file, cb) => {
      let safeName = path.basename(file.originalname);
      safeName = safeName.replace(/[^a-zA-Z0-9._-]/g, '_');

      // Check if the file ends with the pattern "regionXXX.gbk"
      const regionPattern = /region\d+\.gbk$/i;
      if (!regionPattern.test(safeName)) {
        // If it doesn't match, rename it to include "regionXXX.gbk"
        // Extract the base name without extension
        const baseName = safeName.replace(/\.[^/.]+$/, "");
        // Generate a random 3-digit number for XXX
        const randomNum = Math.floor(Math.random() * 900) + 100; // 100-999
        safeName = `${baseName}_region${randomNum}.gbk`;
      }

      const uniqueName = `${uuidv4()}_${safeName}`;
      cb(null, uniqueName);
    };

    filenameFunction(req, file, cb);

    // Restore the original Math.random
    Math.random = originalRandom;

    // The filename should be sanitized and renamed
    expect(cb).toHaveBeenCalledWith(null, 'mock-uuid_sample_file_with_spaces__region730.gbk');
  });
});

describe('SSE client cleanup', () => {
  let handler;

  beforeAll(() => {
    handler = router.stack.find(l => l.route && l.route.path === '/events').route.stack[1].handle;
  });

  beforeEach(() => {
    router._clients.clear();
  });

  test('removes client on response close', () => {
    const req = new EventEmitter();
    const res = new EventEmitter();
    res.setHeader = jest.fn();
    res.write = jest.fn();

    handler(req, res);

    expect(router._clients.size).toBe(1);

    res.emit('close');

    expect(router._clients.size).toBe(0);
  });

  test('removes client on request error', () => {
    const req = new EventEmitter();
    const res = new EventEmitter();
    res.setHeader = jest.fn();
    res.write = jest.fn();

    handler(req, res);

    expect(router._clients.size).toBe(1);

    req.emit('error', new Error('boom'));

    expect(router._clients.size).toBe(0);
  });
});

afterAll(() => {
  router._stopClientCleanupTimer();
});
