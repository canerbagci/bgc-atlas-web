const cacheService = require('../services/cacheService');
const { client } = require('../config/database');

jest.mock('../config/database', () => ({
  client: { query: jest.fn() },
  pool: {}
}));

jest.mock('../services/cacheService', () => ({
  getOrFetch: jest.fn()
}));

const bgcService = require('../services/bgcService');

describe('bgcService.getBgcInfo', () => {
  it('returns bgc info from the database', async () => {
    const rows = [{ bgc_count: 1 }];
    client.query.mockResolvedValue({ rows });
    cacheService.getOrFetch.mockImplementation((key, fetch) => fetch());

    const result = await bgcService.getBgcInfo();

    expect(result).toEqual(rows);
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(cacheService.getOrFetch).toHaveBeenCalledTimes(1);
  });
});
