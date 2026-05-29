import httpStatus from 'http-status';
import { catchAsync } from '../../../shared/CatchAsync.js';
import { authService, userService, tokenService, emailService } from '../services/index.js';
import { serializeUser } from '../user.serializer.js';

const register = catchAsync(async (req, res, next) => {
  const user = await userService.createUser(req.body);
  const tokens = await tokenService.generateAuthTokens(user, undefined, null, req.ip, req.get('User-Agent'));
  res.locals.statusCode = httpStatus.CREATED;
  res.locals.payload = { user: serializeUser(user), tokens };
  next();
});

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user, undefined, null, req.ip, req.get('User-Agent'));
  res.locals.payload = { user: serializeUser(user), tokens };
  next();
});

const logout = catchAsync(async (req, res, next) => {
  await authService.logout(req.body.refreshToken);
  res.locals.statusCode = httpStatus.NO_CONTENT;
  res.locals.payload = null;
  next();
});

const refreshTokens = catchAsync(async (req, res, next) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken, req.ip, req.get('User-Agent'));
  res.locals.payload = { ...tokens };
  next();
});

const forgotPassword = catchAsync(async (req, res, next) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.locals.statusCode = httpStatus.NO_CONTENT;
  res.locals.payload = null;
  next();
});

const resetPassword = catchAsync(async (req, res, next) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.locals.statusCode = httpStatus.NO_CONTENT;
  res.locals.payload = null;
  next();
});

const sendVerificationEmail = catchAsync(async (req, res, next) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.locals.statusCode = httpStatus.NO_CONTENT;
  res.locals.payload = null;
  next();
});

const verifyEmail = catchAsync(async (req, res, next) => {
  await authService.verifyEmail(req.query.token);
  res.locals.statusCode = httpStatus.NO_CONTENT;
  res.locals.payload = null;
  next();
});

export { register, login, logout, refreshTokens, forgotPassword, resetPassword, sendVerificationEmail, verifyEmail };
