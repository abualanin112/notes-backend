# 📝 Production-Grade Notes API Backend

> A secure, high-performance, and highly resilient backend system for note-taking applications, built with Node.js, Express, Prisma ORM, PostgreSQL, and Docker. Hardened for high-concurrency enterprise use cases.

[![Node Version](https://img.shields.io/badge/node-%3E%3D18.18.0-blue.svg?style=flat-square)](https://nodejs.org)
[![Express](https://img.shields.io/badge/express-v4.21.2-green.svg?style=flat-square)](https://expressjs.com)
[![Prisma ORM](https://img.shields.io/badge/prisma-v6.19.3-lightblue.svg?style=flat-square)](https://prisma.io)
[![Vitest](https://img.shields.io/badge/vitest-v4.1.6-purple.svg?style=flat-square)](https://vitest.dev)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg?style=flat-square)](https://docker.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)

This backend represents a complete, secure, and production-ready solution tailored for building robust note-taking services or integrating note management features into larger applications. It provides full user management, session token rotation, robust note manipulation, tags management, and resilient audit logging.

---

## 🌟 Key Features

- **Robust Notes Management (Core)**:
  - Complete CRUD operations for notes (`GET`, `POST`, `PATCH`, `DELETE`).
  - Strict payload validation with Zod (e.g., title limit to 200 characters, tags as array).
  - Advanced querying: full-text search (PostgreSQL index optimized), page pagination, filtering by archiving status, and custom sorting.
- **Secure Authentication & Session Lifecycle**:
  - Passport-powered JWT access and refresh token rotation.
  - Bulletproof token family tracking to immediately invalidate suspicious concurrent sessions.
  - Complete flows for user registration, login, logout, password reset, and email verification.
- **Decoupled Resilient Audit Logging**:
  - Independent `AuditLog` table capturing crucial system events (e.g., `auth.login`, `notes.created`).
  - Avoids database-level foreign key cascades to ensure audit records survive even when users or notes are deleted.
- **Modern Layered Architecture**:
  - Strict separation of concerns (Routes ➔ Middlewares ➔ Controllers ➔ Services ➔ Repositories ➔ Prisma ➔ DB).
- **High-Performance Pino Logging**:
  - Integrated with Node's `AsyncLocalStorage` (ALS) to automatically inject contextual request IDs (`reqId`) and authenticated user IDs (`userId`) deep into nested service logs.
- **Operational Hardening & HA Probes**:
  - Helmet headers protection, rate-limiting, and compression middleware.
  - Kubernets-ready HTTP probes (`/live` for process vitality, `/ready` for DB handshakes, and `/health` for system metrics).
  - Safe, graceful shutdown orchestration under `SIGTERM`/`SIGINT`.
- **Zero-Mock Testing Environment**:
  - Highly isolated testing suite using **Vitest** and **PostgreSQL Testcontainers** to run tests against realistic database instances in Docker.

---

## 🚀 Quick Start & Installation

To boot up the Notes API backend locally, follow these steps:

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/notes-backend.git
cd notes-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create your local `.env` configuration:

```bash
cp .env.example .env
```

Ensure the database connection URL in `.env` points to your target PostgreSQL database. The default configuration connects to the local PostgreSQL spun up by Docker:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/notes_db?schema=public"
JWT_SECRET="your-super-secure-jwt-secret-key"
```

### 4. Database Setup (Docker)

Spin up the local PostgreSQL database using the pre-configured Docker Compose file:

```bash
npm run docker:dev
```

Synchronize the Prisma schema and apply database schema push directly:

```bash
npm run prisma:push
```

### 5. Run the Application

Start the development server with hot-reloading support:

```bash
npm run dev
```

---

## 📐 Architecture & Separation of Concerns

This project enforces a strict unidirectional flow to ensure complete decoupled components and high maintainability:

```text
       ┌──────────────┐
       │  API Client  │
       └──────┬───────┘
              │  HTTP Request
              ▼
       ┌──────────────┐
       │  API Routes  │
       └──────┬───────┘
              │  Payload Validations (Zod)
              ▼
       ┌──────────────┐
       │ Middlewares  │ ◄─── Auth, Rates, Helmet, CORS, ALS Context
       └──────┬───────┘
              │  Sanitized Requests
              ▼
       ┌──────────────┐
       │ Controllers  │ ◄─── Centralized Error Handling (ApiError)
       └──────┬───────┘
              │  Isolated Operations
              ▼
       ┌──────────────┐
       │   Services   │ ◄─── Core Business Logic & DB Transactions
       └──────┬───────┘
              │  Repository Adapters
              ▼
       ┌──────────────┐
       │ Repositories │ ◄─── Prisma DB Clients
       └──────┬───────┘
              │  Parameterized Query Execution
              ▼
       ┌──────────────┐
       │  PostgreSQL  │
       └──────────────┘
```

### Directory Structure

```text
src/
├── bin/            # Custom CLI tools and initializers
├── config/         # System configurations (Environment, ALS, Logger, Passport)
├── controllers/    # API Controllers (request mapping & response orchestration)
├── docs/           # Swagger / OpenAPI specification configs
├── middlewares/    # Custom middlewares (auth rules, error formatters, rate limiters)
├── repositories/   # DB data access layer wrapping Prisma operations
├── routes/         # Router declarations grouped by API version
├── serializers/    # Output formatters (sanitizing DB records before response)
├── services/       # Core business logic services and transaction handling
├── utils/          # Universal helpers (error classes, pagination, crypto)
├── validations/    # Decoupled request payload validations using Zod
├── workers/        # Background cron jobs and queue workers
├── app.js          # Express application initialization & middleware stack
└── index.js        # Server entry point, signal listeners, & process bootstrap
```

---

## ⚡ Available Commands

The following npm scripts are available:

| Command                   | Description                                                            |
| :------------------------ | :--------------------------------------------------------------------- |
| `npm run dev`             | Runs the app in development mode with hot-reloading (Nodemon).         |
| `npm start`               | Runs the app in production mode with PM2 daemon orchestration.         |
| `npm test`                | Runs unit and integration test suites using Vitest and Testcontainers. |
| `npm run test:watch`      | Runs Vitest in interactive watch mode.                                 |
| `npm run coverage`        | Runs tests and generates test coverage report.                         |
| `npm run prisma:generate` | Generates Prisma Client artifacts.                                     |
| `npm run prisma:push`     | Synchronizes Prisma schema with database without applying migrations.  |
| `npm run prisma:studio`   | Launches Prisma Studio database explorer at `http://localhost:5555`.   |
| `npm run docker:dev`      | Boots local PostgreSQL and Adminer stack in the background.            |
| `npm run docker:prod`     | Launches a fully production-optimized containerized app.               |
| `npm run docker:test`     | Spins up the database container ready for test runners.                |
| `npm run lint`            | Validates codebase code style and quality rules using ESLint.          |
| `npm run lint:fix`        | Automatically resolves auto-fixable ESLint rules.                      |
| `npm run prettier`        | Validates formatting using Prettier.                                   |
| `npm run prettier:fix`    | Auto-formats the codebase with Prettier rules.                         |

---

## 🔐 Security & Reliability Standard

- **Dynamic Token Revocation**: Secure JWT lifecycle management. When a refresh token is leaked or reused, the token family tracking invalidates all active tokens associated with that user session.
- **SQL Injection Defeated**: Prisma ORM guarantees query parameterization, rendering SQL injection vectors useless.
- **XSS & HTTP Hardening**: Equipped with custom sanitizers for body payloads, gzip compressions, helmet header security, and smart rate-limiting configurations.
- **Graceful Failover**: Process exit hooks trap OS signals (`SIGINT`/`SIGTERM`) to wait for pending requests (up to 10s), flush DB client connection pools, and exit cleanly without losing inflight transactions.

---

## ⚖️ License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.
