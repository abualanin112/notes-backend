# Logger Infrastructure

## Overview

We use `pino` for fast, structured JSON logging.

## Guidelines

1. **Never use `console.log` in production code.** Use `logger.info`, `logger.error`, `logger.warn`, or `logger.debug`.
2. **Async Local Storage (ALS):** The logger automatically attaches contextual metadata (like `requestId`, `userId`) if called within an active request context. You do not need to pass `req` into the logger manually.
3. **Error Logging:** Always pass the full error object to the logger so that stack traces are captured properly: `logger.error({ err }, 'Message')` instead of `logger.error(err.message)`.
4. **Log Levels:**
   - `error`: System failures requiring immediate attention.
   - `warn`: Recoverable errors or unexpected but handled states.
   - `info`: Key business events and lifecycles.
   - `debug`: Tracing information only useful during active debugging.
