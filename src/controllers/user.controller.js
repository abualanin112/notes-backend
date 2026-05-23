const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService, authorizationService } = require('../services');
const { serializeUser, serializeUsers } = require('../serializers/user.serializer');
const logger = require('../config/logger');

const createUser = catchAsync(async (req, res) => {
  if (req.body.role !== undefined) {
    logger.warn(
      { event: 'legacy.role_field.ignored', role: req.body.role },
      'Ignored deprecated role field in user payload',
    );
    delete req.body.role;
  }
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(serializeUser(user));
});

const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.queryUsers(filter, options);

  // Serialize the pagination results
  result.results = serializeUsers(result.results);
  res.send(result);
});

const getUser = catchAsync(async (req, res) => {
  await authorizationService.assertCanReadUser(req.user, req.params.userId);

  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(serializeUser(user));
});

const updateUser = catchAsync(async (req, res) => {
  await authorizationService.assertCanManageUser(req.user, req.params.userId);

  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(serializeUser(user));
});

const deleteUser = catchAsync(async (req, res) => {
  await authorizationService.assertCanManageUser(req.user, req.params.userId);

  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
