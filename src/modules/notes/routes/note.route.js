const express = require('express');
const { authMiddleware: auth } = require('../../iam');
const { validate } = require('../../shared');
const noteValidation = require('../validations/note.validation');
const noteController = require('../controllers/note.controller');

const router = express.Router();

router
  .route('/')
  .post(auth('create:notes:own'), validate(noteValidation.createNote), noteController.createNote)
  .get(auth('read:notes:own'), validate(noteValidation.getNotes), noteController.getNotes);

router
  .route('/:noteId')
  .get(auth('read:notes:own'), validate(noteValidation.getNote), noteController.getNote)
  .patch(auth('update:notes:own'), validate(noteValidation.updateNote), noteController.updateNote)
  .delete(auth('delete:notes:own'), validate(noteValidation.deleteNote), noteController.deleteNote);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Notes
 *   description: Notes management and retrieval
 */

/**
 * @swagger
 * /notes:
 *   post:
 *     summary: Create a note
 *     description: Only logged in users can create notes.
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NoteInput'
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Note'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   get:
 *     summary: Get all notes
 *     description: Only logged in users can retrieve their own notes.
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search notes by title or content
 *       - in: query
 *         name: archived
 *         schema:
 *           type: boolean
 *         description: Filter by archived status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: "Sort option in the format: sortField:(desc|asc)"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of notes per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Note'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /notes/{noteId}:
 *   get:
 *     summary: Get a note
 *     description: Only logged in users can fetch their own notes.
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *         description: Note id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Note'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a note
 *     description: Only logged in users can update their own notes.
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *         description: Note id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NoteInput'
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Note'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a note
 *     description: Only logged in users can delete their own notes.
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *         description: Note id
 *     responses:
 *       "204":
 *         description: No Content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
