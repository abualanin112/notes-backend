import { z } from 'zod';
import { customValidation } from '../shared/index.js';

const { cuid2Schema } = customValidation;

// Compose createNote using self-contained Zod definitions
const createNote = z.object({
  body: z.object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters'),
    content: z.string().trim().min(1, 'Content is required').max(10000, 'Content cannot exceed 10000 characters'),
    archived: z.boolean().optional(),
    tags: z.array(z.string().trim().toLowerCase()).optional(),
  }),
});

const getNotes = z.object({
  query: z.object({
    search: z.string().optional(),
    archived: z.enum(['true', 'false']).optional(),
    sortBy: z.string().optional(),
    limit: z.coerce.number().int().positive().optional(),
    cursor: cuid2Schema('cursor').optional(),
  }),
});

const getNote = z.object({
  params: z.object({
    noteId: cuid2Schema('noteId'),
  }),
});

// Compose updateNote using self-contained Zod definitions
const updateNote = z.object({
  params: z.object({
    noteId: cuid2Schema('noteId'),
  }),
  body: z
    .object({
      title: z.string().trim().min(3).max(200).optional(),
      content: z.string().trim().min(1).max(10000).optional(),
      archived: z.boolean().optional(),
      tags: z.array(z.string().trim().toLowerCase()).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required',
    }),
});

const deleteNote = z.object({
  params: z.object({
    noteId: cuid2Schema('noteId'),
  }),
});

export { createNote, getNotes, getNote, updateNote, deleteNote };
