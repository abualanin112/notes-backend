const authService = require('./auth.service');
const authorizationService = require('./authorization.service');
const permissionService = require('./permission.service');
const tokenService = require('./token.service');
const userService = require('./user.service');
const emailService = require('./email.service');

module.exports = {
  authService,
  authorizationService,
  permissionService,
  tokenService,
  userService,
  emailService,
};
