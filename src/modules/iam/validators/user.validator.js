import { z } from 'zod';
import { cuid2Schema, password } from '../../../shared/CustomValidator.js';

const createUser = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string(),
    role: z.string().optional(),
    password: z.string().refine(password, {
      message: 'password must be at least 8 characters and contain at least 1 letter and 1 number',
    }),
  }),
});

const getUsers = z.object({
  query: z.object({
    name: z.string().optional(),
    role: z.string().optional(),
    sortBy: z.string().optional(),
    limit: z.coerce.number().int().optional(),
    page: z.coerce.number().int().optional(),
  }),
});

const getUser = z.object({
  params: z.object({
    userId: cuid2Schema('userId'),
  }),
});

// Compose updateUser using self-contained Zod definitions
const updateUser = z.object({
  params: z.object({
    userId: cuid2Schema('userId'),
  }),
  body: z
    .object({
      email: z.string().email().optional(),
      name: z.string().optional(),
      password: z
        .string()
        .refine(password, {
          message: 'password must be at least 8 characters and contain at least 1 letter and 1 number',
        })
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Must have at least one field to update',
    }),
});

const deleteUser = z.object({
  params: z.object({
    userId: cuid2Schema('userId'),
  }),
});

export { createUser, getUsers, getUser, updateUser, deleteUser };
