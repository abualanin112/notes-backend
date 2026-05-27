# Coupling and Boundary Analysis

## 1. Introduction

This document identifies the boundary violations in the current layered architecture that prevent it from being a modular monolith.

## 2. Core Boundary Violations

### 2.1 Domain Logic in Generic Services

The `authorization.service.js` knows about `Notes` and `Users`.

- **Violation**: A generic security service should not possess knowledge of business entities.
- **Solution**: Authorization assertions must be moved to the respective domain modules (e.g., `NoteModule` owns `NoteAuthorizationService`).

### 2.2 Cross-Boundary Data Access

Currently, if `UserService` needs to delete a user's tokens, it calls `TokenRepository` or `TokenService`.

- **Violation**: While calling a Service is better than calling a Repository, the lack of explicit module contracts means `UserService` can bind to internal implementations of the `Auth/Token` module.
- **Solution**: Establish strict interface contracts (e.g., `AuthModule.revokeTokensForUser(userId)`).

### 2.3 Synchronous Auditing

The `AuditService` is called synchronously within business transactions.

- **Coupling**: The domain services are transactionally coupled to the auditing system.
- **Solution**: Move auditing to an asynchronous event bus or use outbox pattern, decoupling the core domain transactions from observability requirements.

## 3. Infrastructure Coupling

- **Redis**: The system degrades gracefully, but Redis logic is intertwined in `index.js` and `health` checks.
- **Request Lifecycle**: `pinoHttp` and `asyncLocalStorage` are set up at the app level but heavily relied upon deep within services without explicit injection.

## 4. Boundary Definition Strategy

We will define boundaries along aggregate roots:

- `IAM (Identity & Access Management)`: Users, Roles, Permissions, Tokens.
- `Notes`: Notes, Tags, Attachments.
- `Audit`: AuditLogs, Observability streams.
- `Core`: Shared kernel, Config, Logger, Prisma proxy, Errors.
