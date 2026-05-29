import express from 'express';
import { registerIamModule, userService } from './iam/index.js';
import { registerNotesModule, deleteManyByOwnerId } from './notes/index.js';
import { config } from '../infrastructure/config.js';
import * as rateLimiter from '../middleware/rate-limiter.middleware.js';
import { docsRoute } from '../docs/docs.route.js';

const router = express.Router();

// COMPOSITION ROOT: MODULE REGISTRATION POINT
registerIamModule(router, {
  authLimiter: config.env === 'production' ? rateLimiter.authLimiter : undefined,
});
registerNotesModule(router);

// INTER-MODULE ORCHESTRATION: Wire deletion cascading
if (typeof userService.registerUserDeletionHook === 'function' && typeof deleteManyByOwnerId === 'function') {
  userService.registerUserDeletionHook((userId, tx) => deleteManyByOwnerId(userId, tx));
}

// DEV Routes
/* istanbul ignore next */
if (config.env === 'development') {
  router.use('/docs', docsRoute);
}

export { router as v1Router };
