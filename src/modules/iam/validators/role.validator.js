import { z } from 'zod';
import { cuid2Schema } from '../../../shared/CustomValidator.js';

const createRole = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    level: z.coerce.number().int().min(0).max(100),
    permissions: z.array(cuid2Schema('permissionId')).optional(),
  }),
});

const getRoles = z.object({
  query: z.object({
    name: z.string().optional(),
    sortBy: z.string().optional(),
    limit: z.coerce.number().int().optional(),
    page: z.coerce.number().int().optional(),
  }),
});

const getRole = z.object({
  params: z.object({
    roleId: cuid2Schema('roleId'),
  }),
});

const updateRole = z.object({
  params: z.object({
    roleId: cuid2Schema('roleId'),
  }),
  body: z
    .object({
      name: z.string().min(2).max(100).optional(),
      description: z.string().optional(),
      level: z.coerce.number().int().min(0).max(100).optional(),
      permissions: z.array(cuid2Schema('permissionId')).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Must have at least one field to update',
    }),
});

const deleteRole = z.object({
  params: z.object({
    roleId: cuid2Schema('roleId'),
  }),
});

const assignRole = z.object({
  params: z.object({
    userId: cuid2Schema('userId'),
  }),
  body: z.object({
    roleId: cuid2Schema('roleId'),
  }),
});

const removeRole = z.object({
  params: z.object({
    userId: cuid2Schema('userId'),
    roleId: cuid2Schema('roleId'),
  }),
});

export { createRole, getRoles, getRole, updateRole, deleteRole, assignRole, removeRole };
