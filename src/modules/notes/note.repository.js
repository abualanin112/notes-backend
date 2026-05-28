import { prisma } from '../infrastructure/index.js';
import { paginateCursor as paginateWithCursor } from '../shared/index.js';

/**
 * Strict, non-bypassable nested relational whitelist
 * to prevent overfetching or database metadata/password leaks.
 */
const cleanNoteIncludes = {
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
};

/**
 * Repository layer for Note entity using Prisma Client
 */

/**
 * Helper to translate search filter to database-specific OR query
 * @param {Object} filter
 * @returns {Object} Translated Prisma where object
 */
const buildWhereClause = (filter) => {
  const { search, ...rest } = filter;

  const where = {
    ...rest,
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ];
  }

  return where;
};

/**
 * Create a new note
 * @param {Object} noteBody
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<Object>}
 */
const create = async (noteBody, tx = prisma) => {
  const { ownerId, ...rest } = noteBody;

  return tx.note.create({
    data: {
      ...rest,
      owner: {
        connect: { id: ownerId },
      },
    },
  });
};

/**
 * Find note by ID with secured relational joins
 * @param {string} id
 * @param {Object} [options]
 * @param {boolean} [options.includeOwner=false]
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<Object|null>}
 */
const findById = async (id, { includeOwner = false } = {}, tx = prisma) => {
  return tx.note.findUnique({
    where: { id },
    ...(includeOwner && { include: cleanNoteIncludes }),
  });
};

/**
 * Update note by ID
 * @param {string} id
 * @param {Object} updateBody
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<Object>}
 */
const updateById = async (id, updateBody, tx = prisma) => {
  const { ownerId, ...rest } = updateBody;

  return tx.note.update({
    where: { id },
    data: {
      ...rest,
      ...(ownerId
        ? {
            owner: { connect: { id: ownerId } },
          }
        : {}),
    },
  });
};

/**
 * Delete note by ID
 * @param {string} id
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<Object>}
 */
const deleteById = async (id, tx = prisma) => {
  return tx.note.delete({
    where: { id },
  });
};

/**
 * Delete all notes for a specific owner
 * @param {string} ownerId
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<Object>}
 */
const deleteManyByOwnerId = async (ownerId, tx = prisma) => {
  return tx.note.deleteMany({
    where: { ownerId },
  });
};

/**
 * Paginate notes using high-performance cursor structures and strict security whitelists
 * @param {Object} filter - Filter options (handles owner, archived, search)
 * @param {Object} options - Pagination options (handles cursor, limit, populate)
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<Object>} Object containing results, nextCursor, and hasNextPage
 */
const paginateNotes = async (filter, options, tx = prisma) => {
  const where = buildWhereClause(filter);
  const limit = parseInt(options.limit, 10) || 10;
  const { cursor } = options;

  // Security Whitelist: If populate includes owner, rewrite it to use cleanNoteIncludes
  let include;
  if (options.populate && options.populate.includes('owner')) {
    include = cleanNoteIncludes;
  }

  return paginateWithCursor(tx.note, {
    where,
    limit,
    cursor,
    include,
  });
};

export { create, findById, updateById, deleteById, deleteManyByOwnerId, paginateNotes };
