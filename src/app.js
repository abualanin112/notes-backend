const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
const config = require('./config/config');
const pinoHttp = require('./config/pinoHttp');
const asyncLocalStorage = require('./config/als');
const { jwtStrategy } = require('./config/passport');
const { authLimiter, apiLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes/v1');
const { errorConverter, errorHandler } = require('./middlewares/error');
const { serializeResponse } = require('./middlewares/response.interceptor');
const ApiError = require('./utils/ApiError');
const prisma = require('./config/prisma');

const app = express();

// enable trust proxy for correct req.ip tracking behind load balancers/proxies
// Explicitly set to 1 for deployment behind reverse proxies like Nginx/Render/Cloudflare
app.set('trust proxy', 1);

// ──────────────────────────────────────────────────────────────
// Operational Health Probes
// ──────────────────────────────────────────────────────────────

const redisConfig = require('./config/redis');

// /live probe: lightweight check for process runtime
app.get('/live', (req, res) => {
  res.status(httpStatus.OK).send({ status: 'UP', shuttingDown: global.isShuttingDown || false });
});

// /ready probe: validates database dependency connectivity under a strict 5s timeout
app.get('/ready', async (req, res) => {
  if (global.isShuttingDown) {
    return res.status(httpStatus.SERVICE_UNAVAILABLE).send({ status: 'NOT_READY', error: 'Shutting down' });
  }

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Database readiness handshake timed out')), 5000);
  });

  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeoutPromise]);
    res.status(httpStatus.OK).send({ status: 'READY' });
  } catch (error) {
    res.status(httpStatus.SERVICE_UNAVAILABLE).send({ status: 'NOT_READY', error: error.message });
  }
});

// /health probe: reports high-level operational statistics
app.get('/health', async (req, res) => {
  if (global.isShuttingDown) {
    return res.status(httpStatus.SERVICE_UNAVAILABLE).send({ status: 'SHUTTING_DOWN' });
  }

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Database health check timed out')), 5000);
  });

  let databaseStatus = 'UP';
  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeoutPromise]);
  } catch (error) {
    databaseStatus = 'DOWN';
  }

  const isCacheDegraded = redisConfig.isDegraded();
  const cacheStatus = isCacheDegraded ? 'DEGRADED' : 'UP';
  
  const overallStatus = databaseStatus === 'DOWN' ? 'DOWN' : (isCacheDegraded ? 'DEGRADED' : 'UP');

  const payload = {
    status: overallStatus,
    uptime: process.uptime(),
    environment: config.env,
    database: databaseStatus,
    cache: cacheStatus,
    workers: config.enableBackgroundWorkers ? 'ENABLED' : 'DISABLED',
    timestamp: new Date().toISOString(),
  };

  // MUST return HTTP 200 for DEGRADED so orchestrators don't aggressively kill the pod
  const statusCode = databaseStatus === 'UP' ? httpStatus.OK : httpStatus.SERVICE_UNAVAILABLE;
  res.status(statusCode).send(payload);
});

// structured request logging and correlation
app.use(pinoHttp);

// inject request scoped context
app.use((req, res, next) => {
  const store = {
    reqId: req.id,
    logger: req.log,
  };
  asyncLocalStorage.run(store, () => next());
});

// set security HTTP headers
app.use(helmet());

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// sanitize request data
app.use(xss());

// gzip compression
app.use(compression());

// enable strict cors whitelist for production security
app.use(cors({ origin: config.cors.origins }));
app.options('*', cors({ origin: config.cors.origins }));

// apply general api rate limiter
app.use('/v1', apiLimiter);

// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use('/v1/auth', authLimiter);
}

// v1 api routes
app.use('/v1', routes);

// apply canonical response serialization pipeline
app.use(serializeResponse);

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = app;
