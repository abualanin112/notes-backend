# Knowledge Base Roadmap

**Backend:** `notes-backend`  
**Plan version:** 2.0 (Enterprise expansion)  
**Status:** Master plan converged — **detailed KB articles not generated yet**

---

## Planning Artifact Index (Project Root)

| File                               | Purpose                        |
| ---------------------------------- | ------------------------------ |
| `KNOWLEDGE_BASE_ROADMAP.md`        | This file — hierarchy + phases |
| `DOCUMENTATION_PHASES.md`          | Phase specs (0–10)             |
| `DOCUMENTATION_EXECUTION_ORDER.md` | Session-by-session AI order    |
| `SYSTEM_DEPENDENCY_GRAPH.md`       | Dependencies + reading order   |
| `ARCHITECTURE_DISCOVERY_REPORT.md` | Inventory + drift              |
| `KNOWLEDGE_BASE_EXPANSION_PLAN.md` | v1→v2 gap analysis             |
| `HIGH_RISK_SYSTEMS_REPORT.md`      | Documentation priorities       |
| `ERP_DOMAIN_MODELING_PLAN.md`      | Domain + future modules        |

---

## Vision

Build an **enterprise-grade internal engineering knowledge base** that:

- Onboards senior backend engineers in **≤ 5 days** (see reading track)
- Prevents architectural drift via explicit philosophy + business rule registry
- Supports **safe ERP module expansion** (users, notes → future entities)
- Complements `notes-backend/docs/migrations/`, `docs/ADR/`, `docs/architecture/`
- Executes incrementally in **14–18 AI sessions** without context exhaustion

---

## Target Hierarchy (v2 — Canonical Articles)

```
notes-backend/docs/knowledge-base/
├── README.md
│
├── 00-core/
│   ├── ARCHITECTURE_PHILOSOPHY.md
│   ├── REQUEST_LIFECYCLE.md
│   └── CANONICAL_SYSTEM_FLOWS.md
│
├── 01-api/
│   ├── API_BOUNDARIES.md
│   ├── VALIDATION_SYSTEM.md
│   └── SERIALIZATION_SYSTEM.md
│
├── 02-security/
│   ├── AUTH_SYSTEM.md
│   ├── RBAC_SYSTEM.md
│   ├── SECURITY_MODEL.md
│   └── ROUTE_PERMISSION_MATRIX.md
│
├── 03-data/
│   ├── DOMAIN_MODELING.md
│   ├── DATABASE_ARCHITECTURE.md
│   └── TRANSACTIONAL_CONSISTENCY.md
│
├── 04-operations/
│   ├── REDIS_AND_CACHING.md
│   ├── WORKERS_AND_CRON.md
│   ├── INFRASTRUCTURE_AND_RESILIENCE.md
│   └── AUDIT_AND_OBSERVABILITY.md
│
├── 05-engineering/
│   ├── TESTING_ARCHITECTURE.md
│   ├── BUSINESS_RULES.md
│   ├── ERP_BUSINESS_LOGIC_GUIDE.md
│   ├── FUTURE_MODULE_ARCHITECTURE.md
│   └── FINAL_ENGINEERING_SUMMARY.md
│
└── 06-domains/                    # Supplements (Phase 8)
    ├── users/
    └── notes/
        └── ownership-vs-rbac.md
```

**Primary articles:** 21 + README + route matrix + optional domain supplements.

---

## Coverage Map (User-Requested Systems)

| Required system         | Canonical article                  | Phase |
| ----------------------- | ---------------------------------- | ----- |
| Request lifecycle       | `REQUEST_LIFECYCLE.md`             | 1     |
| Canonical flows         | `CANONICAL_SYSTEM_FLOWS.md`        | 1     |
| Architecture philosophy | `ARCHITECTURE_PHILOSOPHY.md`       | 1     |
| Validation              | `VALIDATION_SYSTEM.md`             | 2     |
| Serialization           | `SERIALIZATION_SYSTEM.md`          | 2     |
| API boundaries          | `API_BOUNDARIES.md`                | 2     |
| Domain modeling         | `DOMAIN_MODELING.md`               | 5     |
| Database                | `DATABASE_ARCHITECTURE.md`         | 5     |
| Transactions            | `TRANSACTIONAL_CONSISTENCY.md`     | 5     |
| Auth                    | `AUTH_SYSTEM.md`                   | 3     |
| RBAC                    | `RBAC_SYSTEM.md`                   | 4     |
| Security model          | `SECURITY_MODEL.md`                | 4     |
| Redis / cache           | `REDIS_AND_CACHING.md`             | 7     |
| Workers / cron          | `WORKERS_AND_CRON.md`              | 7     |
| Infrastructure          | `INFRASTRUCTURE_AND_RESILIENCE.md` | 7     |
| Audit / observability   | `AUDIT_AND_OBSERVABILITY.md`       | 6     |
| Testing                 | `TESTING_ARCHITECTURE.md`          | 9     |
| Business rules          | `BUSINESS_RULES.md`                | 8     |
| ERP logic               | `ERP_BUSINESS_LOGIC_GUIDE.md`      | 8     |
| Future modules          | `FUTURE_MODULE_ARCHITECTURE.md`    | 10    |
| Final convergence       | `FINAL_ENGINEERING_SUMMARY.md`     | 10    |

---

## Phase Overview (v2)

| Phase  | Name                   | Articles                                      | Complexity |
| ------ | ---------------------- | --------------------------------------------- | ---------- |
| **0**  | Planning & convergence | Root planning MDs only                        | ✅ Done    |
| **1**  | Core architecture      | Philosophy, lifecycle, flows                  | High       |
| **2**  | API contracts          | Boundaries, validation, serialization         | Medium     |
| **3**  | Authentication         | AUTH_SYSTEM                                   | High       |
| **4**  | RBAC & security        | RBAC, security model, route matrix            | High       |
| **5**  | Data & domain          | Domain, database, transactions                | High       |
| **6**  | Audit & observability  | AUDIT_AND_OBSERVABILITY                       | High       |
| **7**  | Infrastructure         | Redis, workers, resilience                    | Medium     |
| **8**  | ERP & business rules   | BUSINESS_RULES, ERP guide, domain supplements | Medium     |
| **9**  | Testing                | TESTING_ARCHITECTURE                          | Medium     |
| **10** | Convergence            | FUTURE_MODULE, FINAL_SUMMARY, README          | Medium     |

**Detail:** `DOCUMENTATION_PHASES.md` · **Sessions:** `DOCUMENTATION_EXECUTION_ORDER.md`

---

## Generation Rules

1. **One session = one execution row** in `DOCUMENTATION_EXECUTION_ORDER.md` (merge only where noted).
2. **Verify against code** — every invariant needs `src/` or `prisma/` pointer.
3. **Link migration docs** — do not duplicate `docs/migrations/` prose.
4. **Drift register** — maintain D01–D08 in `FINAL_ENGINEERING_SUMMARY.md` (Phase 10).
5. **Business rules** — use IDs `BR-*` from `ERP_DOMAIN_MODELING_PLAN.md`.
6. **No implementation changes** during KB generation unless explicitly approved (Phase 11 backlog).

---

## AI Prompt Template (v2)

```text
Execute Documentation Session {N} from DOCUMENTATION_EXECUTION_ORDER.md (project root).
Generate ONLY listed files under notes-backend/docs/knowledge-base/.
Prerequisites: read files named in execution order table for that session.
Verify against notes-backend/src/ and prisma/.
Update ROUTE_PERMISSION_MATRIX / BUSINESS_RULES only when session specifies.
Do not modify application code.
```

---

## Success Criteria

- [ ] 21 primary articles + README + ROUTE_PERMISSION_MATRIX exist
- [ ] `CANONICAL_SYSTEM_FLOWS.md` documents ≥6 flows with diagrams
- [ ] `BUSINESS_RULES.md` has ≥15 rules with IDs and code refs
- [ ] All `/v1` routes in permission matrix
- [ ] Drift D01–D08 tracked with status in final summary
- [ ] Human 5-day reading track validated by staff engineer
- [ ] `FINAL_ENGINEERING_SUMMARY.md` indexes ADRs + superseded migration docs

---

## Immediate Next Step

**Session 1a:** `00-core/ARCHITECTURE_PHILOSOPHY.md` — sets constraints for entire KB.

---

_Expansion rationale: `KNOWLEDGE_BASE_EXPANSION_PLAN.md` · Risks: `HIGH_RISK_SYSTEMS_REPORT.md`_
