jest.mock('../config/database', () => ({
  client: { query: jest.fn() }
}));

const mapService = require('../services/mapService');
const { client } = require('../config/database');

describe('mapService.getMapData', () => {
  it('returns map data from the database', async () => {
    const rows = [{ sample: 's1', longitude: 1.23, latitude: 4.56, assembly: 'a1' }];
    client.query.mockResolvedValue({ rows });

    const result = await mapService.getMapData();

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(result).toEqual(rows);
  });
});
