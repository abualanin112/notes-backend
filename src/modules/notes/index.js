export * from './note.service.js';
import { noteRoutes } from './note.route.js';

/**
 * Register Notes Module Routes
 * @param {import('express').Router} router
 */
export const registerNotesModule = (router) => {
  router.use('/notes', noteRoutes);
};
