/**
 * Perform cursor-based pagination on a Prisma model.
 *
 * Sorts strictly by `orderBy: { id: 'desc' }` using CUID2 characteristics.
 * This completely avoids millisecond-level sorting collisions under high concurrency.
 *
 * @param {object} model - The Prisma model delegate (e.g. prisma.note)
 * @param {object} options - Pagination options
 * @param {string} [options.cursor] - The cursor ID to start after
 * @param {number} options.limit - The number of records to fetch
 * @param {object} [options.where] - Filters to apply to the query
 * @param {object} [options.include] - Relational selections to include
 * @returns {Promise<{results: Array, nextCursor: string|null, hasNextPage: boolean}>}
 */
const paginateCursor = async (model, { cursor, limit, where, include }) => {
  const take = limit + 1;
  const results = await model.findMany({
    take,
    where,
    ...(include && { include }),
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
    orderBy: { id: 'desc' }, // Time-sorted CUID2 makes this mathematically faster and collision-safe
  });

  const hasNextPage = results.length > limit;
  const data = hasNextPage ? results.slice(0, -1) : results;
  const nextCursor = hasNextPage ? data[data.length - 1].id : null;

  return {
    results: data,
    nextCursor,
    hasNextPage,
  };
};

export { paginateCursor };
