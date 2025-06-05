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
    pool.query.mockResolvedValue({ rows });
    cacheService.getOrFetch.mockImplementation((key, fetch) => fetch());

    const result = await bgcService.getBgcInfo();

    expect(result).toEqual(rows);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(cacheService.getOrFetch).toHaveBeenCalledTimes(1);
  });
});

describe('bgcService.getGcfTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('aggregates taxonomy information', async () => {
    const rows = [{ gcf_id: 1, core_taxa: 'GenusA (2)', all_taxa: 'GenusA (2), GenusB (1)' }];
    pool.query.mockResolvedValue({ rows });
    cacheService.getOrFetch.mockImplementation((key, fetch) => fetch());

    const result = await bgcService.getGcfTable();

    expect(pool.query).toHaveBeenCalledTimes(2);
    const sql = pool.query.mock.calls[1][0];
    expect(sql).toMatch(/core_taxa/);
  expect(sql).toMatch(/all_taxa/);
  expect(result.data).toEqual(rows);
  });
});

describe('bgcService.getBgcTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('constructs taxonomy join and returns taxon_name', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ region_id: 1, taxon_name: 'Bacteria' }] });

    const options = {
      draw: 1,
      start: 0,
      length: 10,
      order: [],
      searchBuilder: null
    };

    const result = await bgcService.getBgcTable(options);

    expect(pool.query).toHaveBeenCalledTimes(3);
    expect(pool.query.mock.calls[0][0]).toContain('regions_taxonomy');
    expect(pool.query.mock.calls[0][0]).toContain('taxdump_map');
    expect(result.data[0].taxon_name).toBe('Bacteria');
  });
});
