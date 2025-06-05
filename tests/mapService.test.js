jest.mock('../config/database', () => ({
  pool: { query: jest.fn() }
}));

const mapService = require('../services/mapService');
const { pool } = require('../config/database');

// Reset mock before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe('mapService.getMapData', () => {
  it('returns map data from the database', async () => {
    const rows = [{ sample: 's1', longitude: 1.23, latitude: 4.56, assembly: 'a1' }];
    pool.query.mockResolvedValue({ rows });

    const result = await mapService.getMapData();

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(result).toEqual(rows);
  });
});

describe('mapService.getBiomeDataForGcfs', () => {
  it('returns biome data for specified GCF IDs', async () => {
    // Mock data that would be returned from the database
    const mockRows = [
      { biome: 'root:Environmental:Aquatic', count: '5' },
      { biome: 'root:Environmental:Terrestrial', count: '3' },
      { biome: 'root:Host-associated:Human', count: '2' }
    ];

    pool.query.mockResolvedValue({ rows: mockRows });

    // Test with some GCF IDs
    const gcfIds = [123, 456];
    const result = await mapService.getBiomeDataForGcfs(gcfIds);

    // Verify the query was called with the correct parameters
    expect(pool.query).toHaveBeenCalledTimes(1);

    // Check that the SQL query contains the correct table and column names
    const sqlCall = pool.query.mock.calls[0][0];
    expect(sqlCall).toContain('regions r');
    expect(sqlCall).toContain('r.longest_biome AS biome');
    expect(sqlCall).toContain('r.bigslice_gcf_id IN');

    // Verify the processed results
    expect(result).toEqual([
      { biome: 'Environmental:Aquatic', count: '5' },
      { biome: 'Environmental:Terrestrial', count: '3' },
      { biome: 'Host-associated:Human', count: '2' }
    ]);
  });

  it('handles null biome values correctly', async () => {
    // Mock data with a null biome value
    const mockRows = [
      { biome: null, count: '2' },
      { biome: 'root:Environmental:Aquatic', count: '5' }
    ];

    pool.query.mockResolvedValue({ rows: mockRows });

    const result = await mapService.getBiomeDataForGcfs([123]);

    // Verify the processed results handle null values
    expect(result).toEqual([
      { biome: 'Unknown', count: '2' },
      { biome: 'Environmental:Aquatic', count: '5' }
    ]);
  });

  it('returns empty array when no GCF IDs or samples are provided', async () => {
    const result = await mapService.getBiomeDataForGcfs();

    // Verify no query was made
    expect(pool.query).not.toHaveBeenCalled();

    // Verify empty array is returned
    expect(result).toEqual([]);
  });
});
