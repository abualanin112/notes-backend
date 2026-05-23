const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { noteService } = require('../services');
const { serializeNote, serializeNotes } = require('../serializers/note.serializer');

const createNote = catchAsync(async (req, res) => {
  const note = await noteService.createNote(req.body, req.user.id);
  res.status(httpStatus.CREATED).send(serializeNote(note));
});

const getNotes = catchAsync(async (req, res) => {
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
  result.results = serializeNotes(result.results);

  res.send(result);
});

const getNote = catchAsync(async (req, res) => {
  const note = await noteService.getNoteById(req.params.noteId);
  // Return 404 for both missing notes AND notes owned by another user
  // (avoids information disclosure about note existence)
  if (!note || note.ownerId !== req.user.id) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Note not found');
  }

  res.send(serializeNote(note));
});

const updateNote = catchAsync(async (req, res) => {
  const existingNote = await noteService.getNoteById(req.params.noteId);
  if (!existingNote || existingNote.ownerId !== req.user.id) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Note not found');
  }

  const note = await noteService.updateNoteById(req.params.noteId, req.body);
  res.send(serializeNote(note));
});

const deleteNote = catchAsync(async (req, res) => {
  const existingNote = await noteService.getNoteById(req.params.noteId);
  if (!existingNote || existingNote.ownerId !== req.user.id) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Note not found');
  }

  await noteService.deleteNoteById(req.params.noteId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
};
