/**
 * Parse sortBy string into Prisma orderBy array of objects
 * @param {string} sortBy - Sort criteria in format sortField:(desc|asc) separated by commas
 * @returns {Array<Object>} Prisma orderBy array
 */
const parseSortBy = (sortBy) => {
  if (!sortBy) {
    return [{ createdAt: 'desc' }, { id: 'asc' }];
  }

  const parsed = sortBy.split(',').map((sortOption) => {
    const [key, order] = sortOption.split(':');
    return { [key]: order === 'desc' ? 'desc' : 'asc' };
  });

  // Always append a deterministic tie-breaker to prevent unstable sorting anomalies
  // during offset pagination in PostgreSQL (where identical timestamps cause jumping rows)
  parsed.push({ id: 'asc' });

  return parsed;
};

/**
 * Parse dot-notation populate string into Prisma include object
 * @param {string} populate - Dot-notation relations separated by commas (e.g., "user,owner.notes")
 * @returns {Object|undefined} Prisma include object
 */
const parsePopulate = (populate) => {
  if (!populate) {
    return undefined;
  }

  const include = {};

  populate.split(',').forEach((populateOption) => {
    const parts = populateOption.trim().split('.');
    let current = include;

    parts.forEach((part, index) => {
      // eslint-disable-next-line security/detect-object-injection
      if (!current[part]) {
        // eslint-disable-next-line security/detect-object-injection
        current[part] = index === parts.length - 1 ? true : { include: {} };
        // eslint-disable-next-line security/detect-object-injection
      } else if (current[part] === true) {
        // eslint-disable-next-line security/detect-object-injection
        current[part] = { include: {} };
      }
      // eslint-disable-next-line security/detect-object-injection
      current = current[part].include || current[part];
    });
  });

  return Object.keys(include).length > 0 ? include : undefined;
};

/**
 * Paginate Prisma queries with standard relational return shape
 * @param {Object} prismaModel - The Prisma model delegate (e.g., prisma.user)
 * @param {Object} [filter] - Prisma where filter
 * @param {Object} [options] - Pagination and sorting options
 * @param {string} [options.sortBy] - Sorting criteria (field:asc|desc)
 * @param {string} [options.populate] - Populate relations separated by commas
 * @param {number|string} [options.limit] - Max results per page (default = 10)
 * @param {number|string} [options.page] - Current page (default = 1)
 * @returns {Promise<{results: Array, page: number, limit: number, totalPages: number, totalResults: number}>}
 */
const paginate = async (prismaModel, filter = {}, options = {}) => {
  const limit = options.limit && parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
  const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
  const skip = (page - 1) * limit;

  const orderBy = parseSortBy(options.sortBy);
  const include = parsePopulate(options.populate);

  const [totalResults, results] = await Promise.all([
    prismaModel.count({ where: filter }),
    prismaModel.findMany({
      where: filter,
      orderBy,
      skip,
      take: limit,
      include,
    }),
  ]);

  const totalPages = Math.ceil(totalResults / limit);

  return {
    results,
    page,
    limit,
    totalPages,
    totalResults,
  };
};

export { parseSortBy, parsePopulate, paginate };
