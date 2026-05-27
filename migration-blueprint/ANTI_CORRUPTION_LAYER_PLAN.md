# Anti-Corruption Layer Plan

## 1. Context

As the system evolves into a complex ERP, newly introduced modules (like Accounting or CRM) may have different conceptual models for "User" or "Note" compared to the legacy implementation.

## 2. The Need for ACLs

Currently, `auditService` expects an `entityType`, `entityId`, and `actorId`. It relies on the implicit knowledge that `actorId` maps to the IAM `User.id`.
When introducing a completely detached ERP module (e.g., Billing), we don't want the Billing module to be tightly coupled to the internal `User` object format of the IAM module.

## 3. Implementation Strategy

An Anti-Corruption Layer (ACL) translates models between bounded contexts.

### 3.1 DTO Mapping

When `IAM` exports a user profile, it exports an `IAMUserDTO`. If the `Billing` module requires a `Customer` representation, it implements an ACL internally:

```javascript
// In Billing Module ACL
class CustomerACL {
  static fromIAMUser(iamUser) {
    return {
      customerId: iamUser.id,
      billingEmail: iamUser.email,
      // Drops unnecessary IAM fields like isEmailVerified
    };
  }
}
```

### 3.2 Event Translation

If modules communicate via events (e.g., `UserCreated`), an ACL in the consuming module must translate the generic event payload into the module's ubiquitous language before processing it.

## 4. Phase 1 Execution

No complex ACLs are needed for the immediate IAM/Notes extraction, as they currently share a coherent domain model. However, the interface contracts defined in `index.js` of each module act as a primitive ACL by strictly typing the returned DTOs.
