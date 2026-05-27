const authService = require('./services/auth.service');
const authorizationService = require('./services/authorization.service');
const permissionService = require('./services/permission.service');
const tokenService = require('./services/token.service');
const userService = require('./services/user.service');
const emailService = require('./services/email.service');
const authMiddleware = require('./middleware/auth');
const passportConfig = require('./config/passport');
const authRoutes = require('./routes/auth.route');
const userRoutes = require('./routes/user.route');

// TODO: IAM BOUNDARY

/**
 * Register IAM Module Routes
 * @param {import('express').Router} router
 * @param {Object} options
 */
const registerIamModule = (router, options = {}) => {
  if (options.authLimiter) {
    router.use('/auth', options.authLimiter);
  }
  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
};

module.exports = {
  authService,
  authorizationService,
  permissionService,
  tokenService,
  userService,
  emailService,
  authMiddleware,
  passportConfig,
  authRoutes,
  userRoutes,
  registerIamModule,
};
