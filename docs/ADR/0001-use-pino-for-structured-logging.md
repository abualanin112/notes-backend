# 1. Use Pino for Structured Logging

Date: 2026-05-22

## Status

Accepted

## Context

The legacy backend (Phase 0) utilized a combination of `winston` and `morgan` for observability. However, this setup had several critical flaws for an enterprise-ready environment:

- **Flat Strings**: Logs were formatted as raw text strings rather than structured JSON, making automated parsing, querying, and aggregation via platforms like Datadog or ELK extremely difficult.
- **Lost Context**: Asynchronous operations lacked Request IDs (`reqId`), making it impossible to trace the lifecycle of a single HTTP request across deeply nested services.
- **Performance Constraints**: Winston's synchronous formatting and I/O handling added unnecessary overhead to the main Event Loop.

## Decision

We will standardize entirely on `pino` and `pino-http` as the unified observability stack.
Additionally, we will utilize Node.js's native `AsyncLocalStorage` to implicitly inject `reqId` and `userId` into the logging context across all execution depths without requiring developers to manually pass a logger object down the call stack.

## Consequences

- **Positive**: Blazing fast logging utilizing Pino's `SonicBoom` streams.
- **Positive**: Guaranteed structured JSON output for all environments (except local dev, which uses `pino-pretty`).
- **Positive**: Effortless distributed tracing via auto-injected `reqId`.
- **Negative**: Developers must adhere strictly to the object-first logging format `logger.info({ key: value }, "msg")`.
- **Negative**: The root logger must explicitly redact sensitive fields (`cookie`, `authorization`, `password`) using `pino-redact`.
