import { authRoutes } from './routes/auth.route.js';
import { userRoutes } from './routes/user.route.js';

export * as authService from './services/auth.service.js';
export * as authorizationService from './services/authorization.service.js';
export * as permissionService from './services/permission.service.js';
export * as tokenService from './services/token.service.js';
export * as userService from './services/user.service.js';
export * as emailService from './services/email.service.js';

export { auth as authMiddleware } from './auth.middleware.js';
export * from './passport.js';
/**
 * Register IAM Module Routes
 * @param {import('express').Router} router
 * @param {Object} options
 */
export const registerIamModule = (router, options = {}) => {
  if (options.authLimiter) {
    router.use('/auth', options.authLimiter);
  }

  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
};
