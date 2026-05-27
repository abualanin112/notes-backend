const passport = require('passport');
const httpStatus = require('http-status');
const { ApiError } = require('../../shared');
const permissionService = require('../services/permission.service');
const { als: asyncLocalStorage } = require('../../shared');
const { metrics } = require('../../shared');

/**
 * Passport JWT verify callback factory.
 *
 * Authenticates the user via JWT, then performs a strict permission check
 * against the database-driven RBAC system. This middleware is a pure
 * permission gate — it does NOT contain any implicit bypasses such as
 * "own resource" checks. Ownership logic (ABAC) is deferred entirely
 * to the Service/Controller layer via scoped permissions (`:own` / `:any`).
 *
 * @param {import('express').Request} req
 * @param {Function} resolve
 * @param {Function} reject
 * @param {string[]} requiredPermissions - Permission strings in `action:resource:scope` format
 * @returns {Function} Passport verify callback
 */
const verifyCallback = (req, resolve, reject, requiredPermissions) => async (err, user, info) => {
  // ── Authentication Gate ──────────────────────────────────
  if (err || info || !user) {
    return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }

  req.user = user;

  // Inject userId into observability context for downstream tracing
  const store = asyncLocalStorage.getStore();
  if (store) {
    store.userId = user.id;
    if (store.logger) {
      store.logger = store.logger.child({ userId: user.id });
    }
  }

  // ── Authorization Gate ───────────────────────────────────
  // If no specific permissions are required, authentication alone is sufficient.
  if (!requiredPermissions.length) {
    return resolve();
  }

  try {
    const userPermissions = await permissionService.getUserPermissions(user.id);

    // ALL required permissions must be satisfied (AND logic)
    const hasAllRequired = requiredPermissions.every((perm) => permissionService.matchesPermission(userPermissions, perm));

    if (!hasAllRequired) {
      metrics.auth.authorizationDenied += 1;
      return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    }

    resolve();
  } catch (error) {
    // Permission resolution failure must not leak through as a 200
    reject(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Permission check failed'));
  }
};

/**
 * Express middleware factory for JWT authentication and RBAC authorization.
 *
 * Accepts zero or more permission strings in `action:resource:scope` format.
 * When called with no arguments, only authentication is enforced.
 * When called with permissions, ALL must be present in the user's RBAC set.
 *
 * @example
 * // Authentication only (any logged-in user)
 * router.get('/profile', auth(), controller.getProfile);
 *
 * @example
 * // Single permission required
 * router.get('/users', auth('read:users:any'), controller.getUsers);
 *
 * @example
 * // Multiple permissions required (ALL must be satisfied)
 * router.post('/bookings', auth('create:bookings:any', 'read:properties:any'), controller.createBooking);
 *
 * @param {...string} requiredPermissions - Permission strings (AND logic)
 * @returns {import('express').RequestHandler}
 */
const auth =
  (...requiredPermissions) =>
  async (req, res, next) => {
    return new Promise((resolve, reject) => {
      passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredPermissions))(
        req,
        res,
        next,
      );
    })
      .then(() => next())
      .catch((err) => next(err));
  };

module.exports = auth;
module.exports.verifyCallback = verifyCallback;
