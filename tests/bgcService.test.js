const cacheService = require('../services/cacheService');
const { client, pool } = require('../config/database');

jest.mock('../config/database', () => ({
  client: { query: jest.fn() },
  pool: { query: jest.fn() }
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

describe('bgcService.getGcfTable', () => {
  it('aggregates taxonomy information', async () => {
    const rows = [{ gcf_id: 1, core_taxa: 'GenusA (2)', all_taxa: 'GenusA (2), GenusB (1)' }];
    pool.query.mockResolvedValue({ rows });
    cacheService.getOrFetch.mockImplementation((key, fetch) => fetch());

    const result = await bgcService.getGcfTable();

    expect(pool.query).toHaveBeenCalledTimes(1);
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/core_taxa/);
    expect(sql).toMatch(/all_taxa/);
    expect(result).toEqual(rows);
  });
});
