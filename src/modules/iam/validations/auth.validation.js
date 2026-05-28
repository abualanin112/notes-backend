import { z } from 'zod';
import { customValidation } from '../../shared/index.js';

const { password } = customValidation;

// Compose register using self-contained Zod definitions
const register = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string(),
    password: z.string().refine(password, {
      message: 'password must be at least 8 characters and contain at least 1 letter and 1 number',
    }),
  }),
});

// Compose login using self-contained Zod definitions
const login = z.object({
  body: z.object({
    email: z.string(),
    password: z.string(),
  }),
});

const logout = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
});

const refreshTokens = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
});

const forgotPassword = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

const resetPassword = z.object({
  query: z.object({
    token: z.string(),
  }),
  body: z.object({
    password: z.string().refine(password, {
      message: 'password must be at least 8 characters and contain at least 1 letter and 1 number',
    }),
  }),
});

const verifyEmail = z.object({
  query: z.object({
    token: z.string(),
  }),
});

export { register, login, logout, refreshTokens, forgotPassword, resetPassword, verifyEmail };
