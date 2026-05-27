# Documentation Execution Order

**Purpose:** Single source of truth for **AI session sequencing** and **human reading tracks**.  
**Rule:** One row = one recommended Cursor/Gemini session unless marked mergeable.

---

## 1. AI Generation Track (Strict Order)

| Session | Phase | Files to generate (under `notes-backend/docs/knowledge-base/`)                         | Prerequisite reads                  | Est. size |
| ------- | ----- | -------------------------------------------------------------------------------------- | ----------------------------------- | --------- |
| **0**   | 0     | _(done)_ Planning artifacts at project root                                            | —                                   | —         |
| **1a**  | 1     | `00-core/ARCHITECTURE_PHILOSOPHY.md`                                                   | Discovery §1, Expansion §3          | Large     |
| **1b**  | 1     | `00-core/REQUEST_LIFECYCLE.md`                                                         | Philosophy (constraints)            | Large     |
| **1c**  | 1     | `00-core/CANONICAL_SYSTEM_FLOWS.md`                                                    | Lifecycle + `AUTHORIZATION_FLOW.md` | XLarge    |
| **2a**  | 2     | `01-api/API_BOUNDARIES.md`                                                             | Lifecycle                           | Medium    |
| **2b**  | 2     | `01-api/VALIDATION_SYSTEM.md` + `01-api/SERIALIZATION_SYSTEM.md`                       | API_BOUNDARIES                      | Medium    |
| **3**   | 3     | `02-security/AUTH_SYSTEM.md`                                                           | Canonical flows §auth               | XLarge    |
| **4a**  | 4     | `02-security/RBAC_SYSTEM.md`                                                           | AUTH_SYSTEM                         | XLarge    |
| **4b**  | 4     | `02-security/SECURITY_MODEL.md` + `ROUTE_PERMISSION_MATRIX.md`                         | RBAC_SYSTEM                         | Large     |
| **5a**  | 5     | `03-data/DOMAIN_MODELING.md`                                                           | Philosophy + RBAC                   | Large     |
| **5b**  | 5     | `03-data/DATABASE_ARCHITECTURE.md`                                                     | Domain modeling                     | Large     |
| **5c**  | 5     | `03-data/TRANSACTIONAL_CONSISTENCY.md`                                                 | Database arch                       | Medium    |
| **6**   | 6     | `04-operations/AUDIT_AND_OBSERVABILITY.md`                                             | Transactional consistency           | Large     |
| **7a**  | 7     | `04-operations/REDIS_AND_CACHING.md`                                                   | RBAC cache section                  | Medium    |
| **7b**  | 7     | `04-operations/WORKERS_AND_CRON.md`                                                    | Redis doc                           | Medium    |
| **7c**  | 7     | `04-operations/INFRASTRUCTURE_AND_RESILIENCE.md`                                       | Workers                             | Large     |
| **8a**  | 8     | `05-engineering/BUSINESS_RULES.md`                                                     | ERP plan §3                         | Medium    |
| **8b**  | 8     | `05-engineering/ERP_BUSINESS_LOGIC_GUIDE.md` + `06-domains/notes/ownership-vs-rbac.md` | Business rules                      | Large     |
| **9**   | 9     | `05-engineering/TESTING_ARCHITECTURE.md`                                               | All prior (skim)                    | Medium    |
| **10a** | 10    | `05-engineering/FUTURE_MODULE_ARCHITECTURE.md`                                         | ERP guide                           | Medium    |
| **10b** | 10    | `05-engineering/FINAL_ENGINEERING_SUMMARY.md` + `README.md`                            | All articles exist                  | Medium    |

**Total AI sessions:** 18 (or 14 if merging 2b, 5b+5c, 7a+7b, 10a+10b per team appetite).

---

## 2. Human Reading Track (Onboarding)

For **senior engineer onboarding** (read, don’t generate):

| Day   | Read order                                                                                                 | Outcome                        |
| ----- | ---------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **1** | `README` → `ARCHITECTURE_PHILOSOPHY` → `REQUEST_LIFECYCLE` → `CANONICAL_SYSTEM_FLOWS`                      | Can trace any HTTP request     |
| **2** | `API_BOUNDARIES` → `AUTH_SYSTEM` → `RBAC_SYSTEM` → `ROUTE_PERMISSION_MATRIX`                               | Can add protected route safely |
| **3** | `SECURITY_MODEL` → `DOMAIN_MODELING` → `TRANSACTIONAL_CONSISTENCY`                                         | Can implement mutation safely  |
| **4** | `AUDIT_AND_OBSERVABILITY` → `REDIS_AND_CACHING` → `INFRASTRUCTURE_AND_RESILIENCE`                          | Can operate in prod            |
| **5** | `ERP_BUSINESS_LOGIC_GUIDE` → `BUSINESS_RULES` → `FUTURE_MODULE_ARCHITECTURE` → `FINAL_ENGINEERING_SUMMARY` | Can design new module          |

---

## 3. Parallelization Rules

| Safe parallel                                          | Never parallel                    |
| ------------------------------------------------------ | --------------------------------- |
| Session 7a Redis ∥ 5c Transactions (different authors) | 4a RBAC ∥ 3 AUTH                  |
| 8a Business rules after 5c done                        | 1c Flows before 1b Lifecycle      |
| 9 Testing after 5a Domain started                      | SECURITY_MODEL before RBAC_SYSTEM |

---

## 4. Per-Session AI Prompt (Copy-Paste)

```text
Execute Documentation Session {N} from DOCUMENTATION_EXECUTION_ORDER.md.
Generate ONLY the files listed for that session under notes-backend/docs/knowledge-base/.
Read prerequisite planning docs from project root (max: ARCHITECTURE_DISCOVERY_REPORT.md drift table).
Verify all claims against notes-backend/src/ and notes-backend/prisma/.
Cross-link existing notes-backend/docs/migrations/ and docs/architecture/ where authoritative.
Append new business rules to BUSINESS_RULES.md only if session 8a+.
Do NOT modify application source code.
Output acceptance checklist at end of session.
```

---

## 5. Acceptance Checklist Template (Per Session)

```markdown
## Session {N} Checklist

- [ ] All files in session exist at correct paths
- [ ] Code paths cited with file:line where non-obvious
- [ ] Drift IDs referenced where applicable
- [ ] Links to prerequisite articles work
- [ ] No duplicate full copy of migration docs
- [ ] Mermaid diagrams render
- [ ] ROUTE_PERMISSION_MATRIX updated (if security session)
```

---

## 6. Dependency Quick Reference

```
Philosophy → Lifecycle → Flows
Flows → Auth → RBAC → Security
RBAC → Redis
Lifecycle → API Boundaries → Validation / Serialization
Domain → Database → Transactions
Transactions → Audit
RBAC + Infra → Redis → Workers → Infrastructure
Domain + RBAC → ERP Guide + Business Rules
All → Testing → Future Modules → Final Summary
```

Full graph: `SYSTEM_DEPENDENCY_GRAPH.md`.

---

## 7. Context Minimization Pack (Per Session)

Load **only** these into AI context:

| Session type     | Load                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| Security (3–4)   | `HIGH_RISK_SYSTEMS_REPORT.md` §2–3 + drift D01–D05 + target outline  |
| Data (5)         | `ERP_DOMAIN_MODELING_PLAN.md` + `schema.prisma`                      |
| Infra (7)        | `docs/migrations/REDIS_CIRCUIT_BREAKER_RULES.md` (link summary only) |
| ERP (8)          | `ERP_DOMAIN_MODELING_PLAN.md` §5–7 + controllers                     |
| Convergence (10) | File list from `KNOWLEDGE_BASE_ROADMAP.md` §3                        |

---

_Phases detail: `DOCUMENTATION_PHASES.md` · Structure: `KNOWLEDGE_BASE_ROADMAP.md`_
