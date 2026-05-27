# Safe Refactor Sequence

## 1. Rule of Thumb

Always refactor **Leaves to Root**, not Root to Leaves.

- **Leaves**: Shared Kernel, Utility functions, isolated models (Audit).
- **Middle**: Domain modules (Notes).
- **Root**: Routing, App initialization, cross-cutting IAM security.

## 2. The Strict Sequence

1. **Shared Kernel Utilities**: Move pure functions (Errors, CatchAsync).
2. **Shared Kernel Config**: Move Config, Logger, ALS.
3. **Audit Module**: It has no dependencies other than the Kernel. It is safe to extract first.
4. **Notes Module**: Depends on IAM for auth. We extract Notes and have it call the monolithic IAM.
5. **IAM Module**: Extract IAM last, as it is the most complex and highly depended upon.
6. **Routers**: After all modules are extracted, dismantle the monolithic router.
7. **Prisma Client**: Restrict direct Prisma access module-by-module during steps 3-5.

## 3. The Commit Strategy

Each step above MUST be a separate atomic commit.
At each commit, the entire test suite MUST run and pass. If tests break, the refactor step must be rolled back and reassessed. Do NOT modify tests to "fit" a broken architecture.
