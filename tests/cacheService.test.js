const cacheService = require('../services/cacheService');

beforeEach(() => {
  cacheService.invalidateAll();
});

describe('cacheService.getOrFetch', () => {
  it('fetches data when not cached and caches the result', async () => {
    const fetchFn = jest.fn().mockResolvedValue('value');

    const first = await cacheService.getOrFetch('key', fetchFn);
    expect(first).toBe('value');
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const second = await cacheService.getOrFetch('key', fetchFn);
    expect(second).toBe('value');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('invalidates a key so data is refetched', async () => {
    const fetchFn1 = jest.fn().mockResolvedValue('value1');
    await cacheService.getOrFetch('key2', fetchFn1);
    expect(fetchFn1).toHaveBeenCalledTimes(1);

    cacheService.invalidate('key2');

    const fetchFn2 = jest.fn().mockResolvedValue('value2');
    const result = await cacheService.getOrFetch('key2', fetchFn2);
    expect(result).toBe('value2');
    expect(fetchFn2).toHaveBeenCalledTimes(1);
  });
});
