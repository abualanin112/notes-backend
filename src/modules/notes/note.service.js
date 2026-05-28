import httpStatus from 'http-status';
import { logger, ApiError } from '../shared/index.js';
import {
  create as createNoteRecord,
  paginateNotes as paginateNoteRecords,
  findById,
  updateById as updateNoteByIdRecord,
  deleteById as deleteNoteByIdRecord,
  deleteManyByOwnerId as deleteNotesByOwnerIdRecord,
} from './note.repository.js';
import { runInTransaction } from '../infrastructure/index.js';
// TODO: HIGH-RISK AUTHORIZATION COUPLING
import { logEvent } from '../audit/index.js';

/**
 * Create note
 * @param {Object} noteBody
 * @param {string} ownerId
 * @returns {Promise<Object>}
 */
const createNote = async (noteBody, ownerId) => {
  return runInTransaction(async (tx) => {
    const note = await createNoteRecord({ ...noteBody, ownerId }, tx);

    await logEvent(
      {
        event: 'notes.created',
        entityType: 'Note',
        entityId: note.id,
        action: 'CREATE',
        metadata: { title: note.title },
      },
      tx,
    );

    return note;
  });
};

/**
 * Query notes using high-performance cursor structure
 * @param {Object} filter - Filter parameters
 * @param {Object} options - Pagination options (handles cursor, limit)
 * @returns {Promise<Object>} Object containing results, nextCursor, and hasNextPage
 */
const queryNotes = async (filter, options) => {
  return paginateNoteRecords(filter, options);
};

/**
 * Get note by id
 * @param {string} noteId
 * @returns {Promise<Object|null>}
 */
const getNoteById = async (noteId) => {
  return findById(noteId, { includeOwner: true });
};

/**
 * Update note by id
 * @param {string} noteId
 * @param {Object} updateBody
 * @returns {Promise<Object>}
 */
const updateNoteById = async (noteId, updateBody) => {
  const note = await getNoteById(noteId);
  if (!note) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Note not found');
  }

  return runInTransaction(async (tx) => {
    const updatedNote = await updateNoteByIdRecord(noteId, updateBody, tx);

    await logEvent(
      {
        event: 'notes.updated',
        entityType: 'Note',
        entityId: noteId,
        action: 'UPDATE',
        metadata: { changedFields: Object.keys(updateBody) },
      },
      tx,
    );

    return updatedNote;
  });
};

/**
 * Delete note by id
 * @param {string} noteId
 * @returns {Promise<Object>}
 */
const deleteNoteById = async (noteId) => {
  const note = await getNoteById(noteId);
  if (!note) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Note not found');
  }

  await runInTransaction(async (tx) => {
    await deleteNoteByIdRecord(noteId, tx);

    await logEvent(
      {
        event: 'notes.deleted',
        entityType: 'Note',
        entityId: noteId,
        action: 'DELETE',
      },
      tx,
    );
  });

  logger.info({ event: 'notes.deleted', targetId: noteId, ownerId: note.ownerId }, 'Note deleted successfully');

  return note;
};

/**
 * Delete all notes for a specific owner
 * @param {string} ownerId
 * @param {Object} [tx] - Optional transaction client
 * @returns {Promise<Object>}
 */
const deleteManyByOwnerId = async (ownerId, tx) => {
  return deleteNotesByOwnerIdRecord(ownerId, tx);
};

export { createNote, queryNotes, getNoteById, updateNoteById, deleteNoteById, deleteManyByOwnerId };
