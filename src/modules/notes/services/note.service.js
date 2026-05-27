const httpStatus = require('http-status');
const { logger } = require('../../shared');
const { noteRepository, runInTransaction } = require('../../../repositories');
// TODO: HIGH-RISK AUTHORIZATION COUPLING
const { ApiError } = require('../../shared');
const auditService = require('../../../services/audit.service');

/**
 * Create note
 * @param {Object} noteBody
 * @param {string} ownerId
 * @returns {Promise<Object>}
 */
const createNote = async (noteBody, ownerId) => {
  return runInTransaction(async (tx) => {
    const note = await noteRepository.create({ ...noteBody, ownerId }, tx);

    await auditService.logEvent(
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
  return noteRepository.paginateNotes(filter, options);
};

/**
 * Get note by id
 * @param {string} noteId
 * @returns {Promise<Object|null>}
 */
const getNoteById = async (noteId) => {
  return noteRepository.findById(noteId);
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
    const updatedNote = await noteRepository.updateById(noteId, updateBody, tx);

    await auditService.logEvent(
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
    await noteRepository.deleteById(noteId, tx);

    await auditService.logEvent(
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

module.exports = {
  createNote,
  queryNotes,
  getNoteById,
  updateNoteById,
  deleteNoteById,
};
