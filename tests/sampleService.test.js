jest.mock('../config/database', () => ({
  client: { query: jest.fn() },
  pool: {}
}));

jest.mock('../services/cacheService', () => ({
  getOrFetch: jest.fn()
}));

const sampleService = require('../services/sampleService');
const { client } = require('../config/database');
const cacheService = require('../services/cacheService');

describe('sampleService.getSampleInfo', () => {
  it('returns sample info from the database', async () => {
    const rows = [{ sample_count: 1, success: 2, running: 0, protoclusters: 4, complbgcscount: 3 }];
    client.query.mockResolvedValue({ rows });
    cacheService.getOrFetch.mockImplementation((key, fetch) => fetch());

    const result = await sampleService.getSampleInfo();

    expect(result).toEqual(rows);
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(cacheService.getOrFetch).toHaveBeenCalledTimes(1);
  });
});
