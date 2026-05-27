const express = require('express');
const { registerIamModule } = require('../../modules/iam');
const { registerNotesModule } = require('../../modules/notes');
const docsRoute = require('./docs.route');
const { config, rateLimiter } = require('../../modules/shared');

const router = express.Router();

// COMPOSITION ROOT: MODULE REGISTRATION POINT
registerIamModule(router, {
  authLimiter: config.env === 'production' ? rateLimiter.authLimiter : undefined,
});
registerNotesModule(router);

// DEV Routes
/* istanbul ignore next */
if (config.env === 'development') {
  router.use('/docs', docsRoute);
}

module.exports = router;
