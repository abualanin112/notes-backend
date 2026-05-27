# Workflow Boundary Analysis

## 1. Identifying Workflows

Workflows span multiple bounded contexts. In an ERP system, these are "Business Processes".

## 2. Current Monolithic Workflows

- **User Creation**: Creates a User, assigns a Default Role, generates an Audit Log.
  - _Coupling_: Synchronous. Transaction wraps all three.
- **Note Manipulation**: Edits a note, generates an Audit Log.
  - _Coupling_: Synchronous.

## 3. Future ERP Workflows (Hotspots)

- **Approval Chains**: e.g., A contract is created -> Requires Manager Approval -> Generates Audit -> Sends Notification.
  - This is a complex, long-running workflow.

## 4. Managing Workflow Boundaries in a Modular Monolith

Cross-module transactions must be avoided. Workflows must be orchestrated.

### 4.1 Synchronous Orchestrators (Use Sparingly)

For simple flows (like User Creation), an `Orchestrator` service calls the IAM module, then calls the Audit module. If Audit fails, the transaction is handled explicitly by the orchestrator.

### 4.2 Asynchronous Choreography (Preferred)

For ERP scalability:

1. `NoteModule` completes the note update transaction.
2. It emits an internal event `NoteUpdated`.
3. `AuditModule` listens to `NoteUpdated` and writes to the DB asynchronously.

### 4.3 Saga Pattern

For multi-step distributed transactions (e.g., Billing + Provisioning), implement a Saga coordinator that manages compensating transactions (rollbacks) if a later step fails, ensuring data eventual consistency.
