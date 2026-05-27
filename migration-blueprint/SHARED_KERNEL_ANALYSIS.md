# Shared Kernel Analysis

## 1. Definition

The Shared Kernel consists of code that is universally required by multiple bounded contexts but contains **no domain business logic**. It provides infrastructure, utilities, and foundational patterns.

## 2. Current Assets to Migrate to Shared Kernel

From the monolithic `src/`, the following will be extracted to `src/shared/`:

- `config/config.js` (Environment variable parsing)
- `config/logger.js` (Pino instantiation)
- `config/pinoHttp.js` (Request logging)
- `config/als.js` (AsyncLocalStorage context)
- `config/metrics.js` (Telemetry)
- `config/redis.js` (Cache connections)
- `config/prisma.js` (Database connection proxy)
- `utils/ApiError.js` (Error taxonomy)
- `utils/catchAsync.js` (Promise resolution)
- `middlewares/error.js` (Global error handling)
- `middlewares/rateLimiter.js` (Global IP limiting)

## 3. Required Enhancements for the Modular Monolith

To support isolated modules, the Shared Kernel must introduce:

- **BaseRepository**: An abstract class or utility providing cursor-pagination to ensure consistency across module repositories without duplicating `utils/paginateCursor.js`.
- **Policy Engine Base**: A base utility for enforcing scoped permissions, extracting the generic parts of the current `authorization.service.js`.

## 4. Anti-Pattern Prevention

The Shared Kernel must NEVER import from `src/modules/*`. If the Shared Kernel knows about `Notes` or `Users`, the architecture is compromised.
