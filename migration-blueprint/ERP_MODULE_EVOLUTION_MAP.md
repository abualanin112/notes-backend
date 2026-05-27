# ERP Module Evolution Map

## 1. Strategic Vision

The current monolithic `notes-backend` is the seed for a large-scale Enterprise Resource Planning (ERP) suite. The Modular Monolith architecture acts as the foundational enabler.

## 2. Target ERP Modules

### 2.1 CRM (Customer Relationship Management)

- **Domain**: Leads, Opportunities, Accounts, Contacts.
- **Integration**: Heavily dependent on IAM for sales reps. May wrap `Notes` to attach interactions to `Leads`.

### 2.2 Accounting & Billing

- **Domain**: Invoices, Payments, Ledgers, Tax calculations.
- **Integration**: High isolation required. Needs strict transactional integrity and an Anti-Corruption Layer against CRM and IAM.

### 2.3 HR & Organization Management

- **Domain**: Employees, Departments, Leave Tracking.
- **Integration**: Will likely subsume or heavily influence the `IAM` role/permission hierarchy, injecting complex approval chains into authorization.

### 2.4 Contracts & Approvals

- **Domain**: Document lifecycle, E-signatures, Multi-stage approvals.
- **Integration**: Requires advanced Orchestrator patterns (Sagas) to manage long-running business processes.

## 3. Evolution Strategy

1. **Stabilize Core**: Execute the IAM/Notes/Audit extraction to prove the Modular Monolith pattern.
2. **Introduce Event Bus**: Before adding the first new ERP module, introduce an internal event bus (e.g., EventEmitter2 or local Redis Streams) to decouple cross-module workflows.
3. **Pilot New Module**: Develop the simplest ERP bounded context (e.g., a standalone `Notifications` module) strictly adhering to the new modular rules.
