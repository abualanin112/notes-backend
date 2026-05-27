const noteService = require('./services/note.service');
const noteRoutes = require('./routes/note.route');

// TODO: NOTES DOMAIN BOUNDARY

/**
 * Register Notes Module Routes
 * @param {import('express').Router} router
 */
const registerNotesModule = (router) => {
  router.use('/notes', noteRoutes);
};

module.exports = {
  noteService,
  noteRoutes,
  registerNotesModule,
};
