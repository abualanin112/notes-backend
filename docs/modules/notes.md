# Notes Module

## Purpose

The Notes module manages the creation, updating, retrieval, and deletion of user-owned notes.

## Core Workflows

1. **Note Creation:** Creates notes assigned to the authenticated user.
2. **Note Retrieval:** Fetches single notes or paginated lists of notes with cursor-based or offset-based pagination.
3. **Note Modification:** Updates note content and metadata, enforcing ownership boundaries.
4. **Note Deletion:** Safely removes notes or cascades deletions when users are removed.

## Public API (Services)

- `noteService`: Core CRUD logic for notes.
- `deleteManyByOwnerId`: Called asynchronously by the IAM module when a user is deleted to cascade cleanup.

## Dependencies

- **Infrastructure:** `prisma.js`
- **IAM:** `userService` (for ownership verification and cross-module workflows)
- **Shared:** `Paginate.js`, `PaginateCursor.js`, `CatchAsync.js`, `ApiError.js`
