# Feature Freeze Policy

---

## 1. Scope of Freeze

During the Modular Monolith migration, the following feature freeze windows apply:

### Full Feature Freeze Windows

| Phase                             | Duration | Freeze Type     | Reason                                                                                                                                          |
| --------------------------------- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 3 (IAM Extraction)          | 5–7 days | **FULL FREEZE** | The entire auth stack is being restructured. Any concurrent feature change to auth, users, or permissions creates unresolvable merge conflicts. |
| Phase 5 (Audit Extraction)        | 5–7 days | **FULL FREEZE** | Audit coupling spans the entire system. Concurrent business logic changes that emit audit events will conflict.                                 |
| Phase 7 (Transaction Convergence) | 5–7 days | **FULL FREEZE** | Transaction propagation touches every write operation.                                                                                          |

### Partial Feature Freeze Windows

| Phase     | Duration | Freeze Type | Allowed                                                                                                |
| --------- | -------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| Phase 0–1 | 1–5 days | **PARTIAL** | New features may be developed on separate branches but NOT merged to `main` until the phase completes. |
| Phase 2   | 3–4 days | **PARTIAL** | Bug fixes only. No new endpoints or business logic.                                                    |
| Phase 4   | 3–4 days | **PARTIAL** | IAM changes frozen. Note-unrelated features allowed.                                                   |
| Phase 6   | 2–3 days | **PARTIAL** | Routing changes frozen.                                                                                |
| Phase 8–9 | 2–5 days | **PARTIAL** | No test file changes outside the migration scope.                                                      |

## 2. Hotfix Policy During Freeze

If a critical production bug is discovered during a freeze window:

1. **Fix on `main`** — create a hotfix branch from `main`, apply the fix, merge to `main`.
2. **Rebase migration branch** — `git rebase main` on the active phase branch.
3. **Resolve conflicts** — apply the hotfix logic to the new modular file locations.
4. **Re-run test gates** — full `npm test` after rebase.

## 3. Communication Protocol

- Announce each freeze window 48 hours before it begins.
- Share the expected duration and which areas of the codebase are frozen.
- Post the `checkpoint/phase-N-complete` tag in the team channel when the freeze lifts.

## 4. Exception Process

If a feature absolutely must be merged during a freeze:

1. The feature owner must demonstrate that their changes do NOT touch any file in the active phase's scope.
2. The migration lead reviews and approves.
3. The feature is merged to `main`, and the phase branch is rebased.
