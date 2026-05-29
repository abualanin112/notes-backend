# Identity and Access Management (IAM) Module

## Purpose

The IAM module handles all user authentication, authorization, registration, and identity-related workflows.

## Core Workflows

1. **User Registration:** Processes new user signups, hashes passwords, and creates initial tokens.
2. **Authentication:** Validates credentials, issues JWT access and refresh tokens.
3. **Password Management:** Handles password resets, email verification, and token lifecycle.
4. **Authorization:** Uses CASL (or equivalent) to enforce role-based and attribute-based permissions.

## Public API (Services)

- `userService`: Create, read, update, delete users. Check permissions.
- `authService`: Login, logout, refresh tokens, reset passwords.
- `tokenService`: Generate, verify, and invalidate tokens.
- `emailService`: Send welcome and reset emails.

## Dependencies

- **Infrastructure:** `prisma.js`, `redis.js` (for rate limiting/token blacklists), `mailer.js`
- **Shared:** `Tokens.js`, `Password.js`, `CatchAsync.js`, `CustomValidator.js`, `ApiError.js`
