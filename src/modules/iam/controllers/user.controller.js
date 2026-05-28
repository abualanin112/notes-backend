import httpStatus from 'http-status';
import { pick, ApiError, catchAsync, logger } from '../../shared/index.js';
import { userService, authorizationService } from '../services/index.js';
import { serializeUser } from '../user.serializer.js';

const createUser = catchAsync(async (req, res, next) => {
  if (req.body.role !== undefined) {
    logger.warn(
      { event: 'legacy.role_field.ignored', role: req.body.role },
      'Ignored deprecated role field in user payload',
    );
    delete req.body.role;
  }
  const user = await userService.createUser(req.body);
  res.locals.statusCode = httpStatus.CREATED;
  res.locals.payload = user;
  res.locals.serializer = serializeUser;
  next();
});

const getUsers = catchAsync(async (req, res, next) => {
  const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.queryUsers(filter, options);
  res.locals.payload = result;
  res.locals.serializer = serializeUser;
  next();
});

const getUser = catchAsync(async (req, res, next) => {
  await authorizationService.assertCanReadUser(req.user, req.params.userId);

  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.locals.payload = user;
  res.locals.serializer = serializeUser;
  next();
});

const updateUser = catchAsync(async (req, res, next) => {
  await authorizationService.assertCanManageUser(req.user, req.params.userId);

  const user = await userService.updateUserById(req.params.userId, req.body);
  res.locals.payload = user;
  res.locals.serializer = serializeUser;
  next();
});

const deleteUser = catchAsync(async (req, res, next) => {
  await authorizationService.assertCanManageUser(req.user, req.params.userId);

  await userService.deleteUserById(req.params.userId);
  res.locals.statusCode = httpStatus.NO_CONTENT;
  res.locals.payload = null;
  next();
});

export { createUser, getUsers, getUser, updateUser, deleteUser };
