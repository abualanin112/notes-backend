const httpStatus = require('http-status');
const { ApiError } = require('../../shared');
const permissionService = require('./permission.service');
const { logger } = require('../../shared');
const auditService = require('../../../services/audit.service');
const { prisma } = require('../../infrastructure');

// ──────────────────────────────────────────────────────────────
// Scope-Aware Permission Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Assert that the actor has the required scoped permission on a target resource.
 *
 * This is the central ownership-resolution function. It determines the correct
 * scope (`:own` vs `:any`) based on whether the actor owns the target resource,
 * then checks against the RBAC permission set:
 *
 *  - If `actorId === resourceOwnerId` → checks `{action}:{resource}:own`
 *    (which is also satisfied by `{action}:{resource}:any` via scope escalation)
 *  - If `actorId !== resourceOwnerId` → checks `{action}:{resource}:any`
 *
 * @param {Object} actor - Authenticated user object (must have `id`)
 * @param {string} resourceOwnerId - The ID of the resource owner
 * @param {string} action - RBAC action verb (e.g., `read`, `update`, `delete`)
 * @param {string} resource - RBAC resource name (e.g., `users`, `notes`)
 * @returns {Promise<boolean>} Resolves `true` if access is granted
 * @throws {ApiError} 403 if access is denied
 */
const assertScopedPermission = async (actor, resourceOwnerId, action, resource) => {
  const isOwnResource = actor.id === resourceOwnerId;
  const requiredScope = isOwnResource ? 'own' : 'any';
  const permission = `${action}:${resource}:${requiredScope}`;

  if (await permissionService.hasPermission(actor.id, permission)) {
    return true;
  }

  // Access denied — determine severity for logging
  const logContext = {
    event: 'authz.access.denied',
    actorId: actor.id,
    targetOwnerId: resourceOwnerId,
    permission,
    isOwnResource,
  };

  if (!isOwnResource) {
    // Cross-resource access attempt without :any scope is a potential escalation
    logger.error({ ...logContext, event: 'authz.escalation.attempted' }, 'Suspicious privilege escalation attempt');
    await auditService.logEvent({
      event: 'authz.escalation.attempted',
      entityType: resource,
      entityId: resourceOwnerId,
      action: action.toUpperCase(),
      reason: `Attempted ${action}:${resource}:any without permission`,
    });
  } else {
    logger.warn(logContext, `Denied ${action} access to own ${resource}`);
  }

  throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
};

// ──────────────────────────────────────────────────────────────
// Domain-Specific Assertions
// ──────────────────────────────────────────────────────────────

/**
 * Assert the actor can read a specific user profile.
 *
 * - Own profile → requires `read:users:own`
 * - Other user  → requires `read:users:any`
 *
 * @param {Object} actor - The authenticated user
 * @param {string} targetUserId - The user being accessed
 * @returns {Promise<boolean>}
 * @throws {ApiError} 403 if access is denied
 */
const assertCanReadUser = async (actor, targetUserId) => {
  return assertScopedPermission(actor, targetUserId, 'read', 'users');
};

/**
 * Assert the actor can update or delete a specific user.
 *
 * - Own account → requires `update:users:own`
 * - Other user  → requires `update:users:any`
 *
 * @param {Object} actor - The authenticated user
 * @param {string} targetUserId - The user being modified
 * @returns {Promise<boolean>}
 * @throws {ApiError} 403 if access is denied
 */
const assertCanManageUser = async (actor, targetUserId) => {
  return assertScopedPermission(actor, targetUserId, 'update', 'users');
};

/**
 * Assert if actor can manage a note
 * @param {Object} actor - The user attempting the action
 * @param {string} noteOwnerId - The owner of the note
 * @throws {ApiError} if forbidden
 *
 * // TODO: FUTURE EXTRACTION POINT
 * // Note ownership rules will be moved to src/modules/notes/policies/note.policy.js in Phase 4.
 */
const assertCanManageNote = async (actor, noteOwnerId) => {
  return assertScopedPermission(actor, noteOwnerId, 'update', 'notes');
};

// ──────────────────────────────────────────────────────────────
// Role Assignment — Escalation Prevention
// ──────────────────────────────────────────────────────────────

/**
 * Assert that the actor is allowed to assign a specific role to a target user.
 *
 * Enforces two rules:
 *  1. The actor must hold the `assign:roles:any` permission.
 *  2. The target role's `level` must NOT exceed the actor's own maximum
 *     role level (prevents vertical privilege escalation).
 *
 * @param {Object} actor - The authenticated user performing the assignment
 * @param {string} targetRoleId - The CUID of the role being assigned
 * @returns {Promise<boolean>}
 * @throws {ApiError} 403 if escalation is detected, 404 if role not found
 */
const assertCanAssignRole = async (actor, targetRoleId) => {
  // 1. Gate: actor must have the role-assignment permission
  if (!(await permissionService.hasPermission(actor.id, 'assign:roles:any'))) {
    logger.warn(
      { event: 'authz.role_assign.denied', actorId: actor.id, targetRoleId },
      'Role assignment denied — missing assign:roles:any permission',
    );
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }

  // 2. Escalation check: resolve both levels
  const [actorMaxLevel, targetRole] = await Promise.all([
    permissionService.getMaxRoleLevel(actor.id),
    prisma.role.findUnique({ where: { id: targetRoleId }, select: { id: true, name: true, level: true } }),
  ]);

  if (!targetRole) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }

  if (targetRole.level > actorMaxLevel) {
    logger.error(
      {
        event: 'authz.escalation.attempted',
        actorId: actor.id,
        actorMaxLevel,
        targetRoleId,
        targetRoleLevel: targetRole.level,
        targetRoleName: targetRole.name,
      },
      'Privilege escalation attempt — target role level exceeds actor level',
    );
    await auditService.logEvent({
      event: 'authz.escalation.attempted',
      entityType: 'Role',
      entityId: targetRoleId,
      action: 'EXECUTE',
      reason: `Attempted to assign role "${targetRole.name}" (level ${targetRole.level}) but actor max level is ${actorMaxLevel}`,
    });
    throw new ApiError(httpStatus.FORBIDDEN, 'Cannot assign a role with a higher privilege level than your own');
  }

  return true;
};

/**
 * Assign a role to a user.
 *
 * Enforces escalation prevention, creates the UserRole record,
 * logs the audit event, and invalidates the user's permission cache.
 *
 * @param {Object} actor - The user performing the assignment
 * @param {string} targetUserId - The user receiving the role
 * @param {string} roleId - The CUID of the role to assign
 * @returns {Promise<Object>} The created UserRole record
 */
const assignRoleToUser = async (actor, targetUserId, roleId) => {
  // 1. Enforce escalation and assignment rules
  await assertCanAssignRole(actor, roleId);

  // 2. Perform the assignment inside a transaction
  return prisma.$transaction(async (tx) => {
    const userRole = await tx.userRole.create({
      data: {
        userId: targetUserId,
        roleId,
        assignedBy: actor.id,
      },
    });

    // 3. Trigger audit log for assignment
    await auditService.logEvent(
      {
        event: 'authz.role.assigned',
        entityType: 'UserRole',
        entityId: userRole.id,
        action: 'CREATE',
        actorId: actor.id,
        metadata: { targetUserId, roleId },
      },
      tx,
    );

    // 4. Invalidate cache so permissions update immediately
    await permissionService.invalidateUserPermissionCache(targetUserId);

    logger.info(
      { event: 'authz.role.assigned', actorId: actor.id, targetUserId, roleId },
      'Role successfully assigned to user',
    );

    return userRole;
  });
};

module.exports = {
  assertScopedPermission,
  assertCanReadUser,
  assertCanManageUser,
  assertCanManageNote,
  assertCanAssignRole,
  assignRoleToUser,
};
