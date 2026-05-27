const httpStatus = require('http-status');
const { ApiError, catchAsync } = require('../../shared');
const noteService = require('../services/note.service');
const { serializeNote } = require('../serializers/note.serializer');

const createNote = catchAsync(async (req, res, next) => {
  const note = await noteService.createNote(req.body, req.user.id);
  res.locals.statusCode = httpStatus.CREATED;
  res.locals.payload = note;
  res.locals.serializer = serializeNote;
  next();
});

const getNotes = catchAsync(async (req, res, next) => {
  const filter = {
    ownerId: req.user.id,
  };

  if (req.query.archived) {
    filter.archived = req.query.archived === 'true';
  }

  if (req.query.search) {
    filter.search = req.query.search;
  }

  const options = {
    sortBy: req.query.sortBy || 'createdAt:desc',

    limit: req.query.limit || 10,

    cursor: req.query.cursor,
  };

  const result = await noteService.queryNotes(filter, options);
  res.locals.payload = result;
  res.locals.serializer = serializeNote;
  next();
});

const getNote = catchAsync(async (req, res, next) => {
  const note = await noteService.getNoteById(req.params.noteId);
  // Return 404 for both missing notes AND notes owned by another user
  // (avoids information disclosure about note existence)
  if (!note || note.ownerId !== req.user.id) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Note not found');
  }

  res.locals.payload = note;
  res.locals.serializer = serializeNote;
  next();
});

const updateNote = catchAsync(async (req, res, next) => {
  const existingNote = await noteService.getNoteById(req.params.noteId);
  if (!existingNote || existingNote.ownerId !== req.user.id) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Note not found');
  }

  const note = await noteService.updateNoteById(req.params.noteId, req.body);
  res.locals.payload = note;
  res.locals.serializer = serializeNote;
  next();
});

const deleteNote = catchAsync(async (req, res, next) => {
  const existingNote = await noteService.getNoteById(req.params.noteId);
  if (!existingNote || existingNote.ownerId !== req.user.id) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Note not found');
  }

  await noteService.deleteNoteById(req.params.noteId);
  res.locals.statusCode = httpStatus.NO_CONTENT;
  res.locals.payload = null;
  next();
});

module.exports = {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
};
