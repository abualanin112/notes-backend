import { paginateCursor as paginateWithCursor } from '../../../src/modules/shared/index.js';

describe('Paginate Cursor Utility', () => {
  let mockModel;

  beforeEach(() => {
    mockModel = {
      findMany: vi.fn(),
    };
  });

  test('should return results, nextCursor, and hasNextPage when there is a next page', async () => {
    const mockData = [
      { id: 'cuid1', title: 'Note 1' },
      { id: 'cuid2', title: 'Note 2' },
      { id: 'cuid3', title: 'Note 3' }, // extra record for hasNextPage check
    ];
    mockModel.findMany.mockResolvedValue(mockData);

    const result = await paginateWithCursor(mockModel, {
      limit: 2,
      where: { archived: false },
    });

    expect(mockModel.findMany).toHaveBeenCalledWith({
      take: 3,
      where: { archived: false },
      orderBy: { id: 'desc' },
    });

    expect(result).toEqual({
      results: [
        { id: 'cuid1', title: 'Note 1' },
        { id: 'cuid2', title: 'Note 2' },
      ],
      nextCursor: 'cuid2',
      hasNextPage: true,
    });
  });

  test('should return results, nextCursor null, and hasNextPage false when there is no next page', async () => {
    const mockData = [
      { id: 'cuid1', title: 'Note 1' },
      { id: 'cuid2', title: 'Note 2' },
    ];
    mockModel.findMany.mockResolvedValue(mockData);

    const result = await paginateWithCursor(mockModel, {
      limit: 5,
      where: { archived: false },
    });

    expect(mockModel.findMany).toHaveBeenCalledWith({
      take: 6,
      where: { archived: false },
      orderBy: { id: 'desc' },
    });

    expect(result).toEqual({
      results: [
        { id: 'cuid1', title: 'Note 1' },
        { id: 'cuid2', title: 'Note 2' },
      ],
      nextCursor: null,
      hasNextPage: false,
    });
  });

  test('should pass skip and cursor options to findMany when cursor is provided', async () => {
    mockModel.findMany.mockResolvedValue([]);

    await paginateWithCursor(mockModel, {
      limit: 10,
      cursor: 'cuid10',
    });

    expect(mockModel.findMany).toHaveBeenCalledWith({
      take: 11,
      skip: 1,
      cursor: { id: 'cuid10' },
      orderBy: { id: 'desc' },
    });
  });
});
