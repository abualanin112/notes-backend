# Security Regression Matrix

This matrix defines the critical security assertions that must pass at every phase of the refactor.

| Domain     | Action      | Actor Role/Permission      | Target            | Expected Result              |
| ---------- | ----------- | -------------------------- | ----------------- | ---------------------------- |
| **Notes**  | Read        | User (No `read:notes:any`) | Own Note          | `200 OK`                     |
| **Notes**  | Read        | User (No `read:notes:any`) | Other's Note      | `404 Not Found` (Masked)     |
| **Notes**  | Read        | Admin (`read:notes:any`)   | Other's Note      | `200 OK`                     |
| **Notes**  | Update      | User                       | Other's Note      | `404 Not Found` (Masked)     |
| **IAM**    | Assign Role | User (Level 10)            | Assign Level 50   | `403 Forbidden` (Escalation) |
| **IAM**    | Assign Role | Admin (Level 100)          | Assign Level 50   | `200 OK`                     |
| **Audit**  | Query       | Admin                      | Global Logs       | `200 OK`                     |
| **Audit**  | Query       | User                       | Global Logs       | `403 Forbidden`              |
| **Tokens** | Refresh     | User                       | Blacklisted Token | `401 Unauthorized`           |
| **Tokens** | Refresh     | User                       | Valid Token       | `200 OK`                     |

## Enforcement

The `integration/security.test.js` suite currently automates this matrix. It must NOT be modified to be more permissive during the refactor. Any failure indicates a boundary or logic leak.
