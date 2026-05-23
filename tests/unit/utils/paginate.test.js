const { parseSortBy, parsePopulate, paginate } = require('../../../src/utils/paginate');

describe('Paginate Utility', () => {
  describe('parseSortBy', () => {
    test('should return default sort by createdAt:desc when no value is provided', () => {
      expect(parseSortBy()).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
      expect(parseSortBy('')).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
    });

    test('should parse single field sorting', () => {
      expect(parseSortBy('name:asc')).toEqual([{ name: 'asc' }, { id: 'asc' }]);
      expect(parseSortBy('role:desc')).toEqual([{ role: 'desc' }, { id: 'asc' }]);
    });

    test('should parse multiple field sorting', () => {
      expect(parseSortBy('role:desc,name:asc')).toEqual([{ role: 'desc' }, { name: 'asc' }, { id: 'asc' }]);
    });
  });

  describe('parsePopulate', () => {
    test('should return undefined when no populate value is provided', () => {
      expect(parsePopulate()).toBeUndefined();
      expect(parsePopulate('')).toBeUndefined();
    });

    test('should parse simple population', () => {
      expect(parsePopulate('user')).toEqual({ user: true });
    });

    test('should parse nested dot population', () => {
      expect(parsePopulate('owner.notes')).toEqual({
        owner: {
          include: {
            notes: true,
          },
        },
      });
    });

    test('should parse multiple population fields', () => {
      expect(parsePopulate('user,tokens')).toEqual({
        user: true,
        tokens: true,
      });
    });
  });

  describe('paginate function', () => {
    let mockModel;

    beforeEach(() => {
      mockModel = {
        count: vi.fn().mockResolvedValue(25),
        findMany: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
      };
    });

    test('should call count and findMany with correct arguments and return exact shape', async () => {
      const filter = { role: 'user' };
      const options = {
        limit: 10,
        page: 2,
        sortBy: 'name:asc',
        populate: 'notes',
      };

      const result = await paginate(mockModel, filter, options);

      expect(mockModel.count).toHaveBeenCalledWith({ where: filter });
      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: filter,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: 10,
        take: 10,
        include: { notes: true },
      });

      expect(result).toEqual({
        results: [{ id: 1 }, { id: 2 }],
        page: 2,
        limit: 10,
        totalPages: 3,
        totalResults: 25,
      });
    });
  });
});
