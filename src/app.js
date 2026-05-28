import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import passport from 'passport';
import httpStatus from 'http-status';
import {
  config,
  pinoHttp,
  als as asyncLocalStorage,
  ApiError,
  rateLimiter,
  error,
  responseInterceptor,
} from './modules/shared/index.js';
import { v1Router } from './modules/router.js';
import { jwtStrategy } from './modules/iam/passport.js';
import { prisma, isRedisDegraded } from './modules/infrastructure/index.js';

const { apiLimiter } = rateLimiter;
const { errorConverter, errorHandler } = error;
const { serializeResponse } = responseInterceptor;

const app = express();

// enable trust proxy for correct req.ip tracking behind load balancers/proxies
// Explicitly set to 1 for deployment behind reverse proxies like Nginx/Render/Cloudflare
app.set('trust proxy', 1);

// ──────────────────────────────────────────────────────────────
// Operational Health Probes
// ──────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────

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
  } catch (err) {
    res.status(httpStatus.SERVICE_UNAVAILABLE).send({ status: 'NOT_READY', error: err.message });
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
  } catch {
    databaseStatus = 'DOWN';
  }

  const isCacheDegraded = isRedisDegraded();
  const cacheStatus = isCacheDegraded ? 'DEGRADED' : 'UP';

  let overallStatus = 'UP';
  if (databaseStatus === 'DOWN') {
    overallStatus = 'DOWN';
  } else if (isCacheDegraded) {
    overallStatus = 'DEGRADED';
  }

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

// mount unified v1 router
app.use('/v1', v1Router);

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

export { app };
