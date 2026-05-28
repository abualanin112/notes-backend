import { prisma, cacheGet, cacheSet, cacheDel, cacheIncr } from '../../infrastructure/index.js';
import { logger } from '../../shared/index.js';

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

const CACHE_PREFIX = 'rbac:permissions';
const CACHE_TTL_SECONDS = 300; // 5 minutes
const WILDCARD_PERMISSION = '*:*:*';

// ──────────────────────────────────────────────────────────────
// Cache Versioning & Invalidation
// ──────────────────────────────────────────────────────────────

const GLOBAL_VERSION_KEY = 'rbac:permissions:version';

/**
 * Get the current global cache version for the RBAC namespace.
 * Defaults to 1 if not set.
 * @returns {Promise<number>}
 */
const getCacheVersion = async () => {
  const version = await cacheGet(GLOBAL_VERSION_KEY);
  if (version) return parseInt(version, 10);

  await cacheSet(GLOBAL_VERSION_KEY, 1, 60 * 60 * 24 * 365); // 1 year
  return 1;
};

/**
 * Increment the global RBAC cache version.
 * This instantly invalidates all cached permissions across the system,
 * acting as a safety switch during RBAC schema evolution.
 * Uses Redis INCR for atomic increments to prevent race conditions.
 * @returns {Promise<number>}
 */
const bumpGlobalPermissionCacheVersion = async () => {
  const newVersion = await cacheIncr(GLOBAL_VERSION_KEY);
  logger.info({ event: 'rbac.cache.version_bumped', newVersion }, 'Global permission cache version bumped atomically');
  return newVersion;
};

/**
 * Resolve all permission strings for a user by traversing the RBAC graph:
 * User → UserRole → Role → RolePermission → Permission.
 *
 * Results are cached under `rbac:permissions:vX:user:{userId}` with a 5-minute TTL.
 * On cache miss, performs a single Prisma query with nested includes.
 *
 * @param {string} userId - The user's CUID
 * @returns {Promise<Set<string>>} Set of `action:resource:scope` permission strings
 */
const getUserPermissions = async (userId) => {
  const version = await getCacheVersion();
  const cacheKey = `${CACHE_PREFIX}:v${version}:user:${userId}`;

  // 1. Cache lookup
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return new Set(cached);
  }

  // 2. DB query — single round-trip via nested includes
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  // 3. Flatten into `action:resource:scope` strings
  const permissions = new Set();
  userRoles.forEach((ur) => {
    ur.role.rolePermissions.forEach((rp) => {
      const { action, resource, scope } = rp.permission;
      permissions.add(`${action}:${resource}:${scope}`);
    });
  });

  // 4. Persist to cache
  const permArray = Array.from(permissions);
  await cacheSet(cacheKey, permArray, CACHE_TTL_SECONDS);

  logger.debug(
    { event: 'rbac.permissions.resolved', userId, count: permArray.length, cacheKey },
    'User permissions resolved from database and cached',
  );

  return permissions;
};

// ──────────────────────────────────────────────────────────────
// Permission Matching (Pure Logic — No I/O)
// ──────────────────────────────────────────────────────────────

/**
 * Pure function: check if a required permission is satisfied by a set
 * of granted permissions.
 *
 * Match strategies (evaluated in order):
 *  1. **Exact match** — `update:notes:own` in set
 *  2. **Wildcard** — `*:*:*` grants everything (super admin)
 *  3. **Scope escalation** — `:any` implicitly covers `:own`
 *     (e.g., having `update:notes:any` satisfies a check for `update:notes:own`)
 *
 * @param {Set<string>} grantedPermissions - The user's resolved permission set
 * @param {string} requiredPermission - The permission to check (`action:resource:scope`)
 * @returns {boolean}
 */
const matchesPermission = (grantedPermissions, requiredPermission) => {
  // Exact match
  if (grantedPermissions.has(requiredPermission)) return true;

  // Super admin wildcard
  if (grantedPermissions.has(WILDCARD_PERMISSION)) return true;

  // Scope escalation: :any supersedes :own
  if (requiredPermission.endsWith(':own')) {
    const anyVariant = requiredPermission.replace(/:own$/, ':any');
    if (grantedPermissions.has(anyVariant)) return true;
  }

  return false;
};

/**
 * Convenience wrapper: check if a user holds a specific permission.
 * Involves a cache/DB lookup via `getUserPermissions`, then delegates
 * to the pure `matchesPermission` for the actual check.
 *
 * @param {string} userId - The user's CUID
 * @param {string} permission - Permission string in `action:resource:scope` format
 * @returns {Promise<boolean>}
 */
const hasPermission = async (userId, permission) => {
  const permissions = await getUserPermissions(userId);

  // Wildcard short-circuit for max performance
  if (permissions.has(WILDCARD_PERMISSION)) return true;

  return matchesPermission(permissions, permission);
};

// ──────────────────────────────────────────────────────────────
// Role Level Resolution (Escalation Prevention)
// ──────────────────────────────────────────────────────────────

/**
 * Get the highest privilege level across all roles assigned to a user.
 * Returns 0 if the user has no assigned roles.
 *
 * Used for escalation prevention: an actor cannot assign a role
 * with a `level` higher than their own maximum.
 *
 * @param {string} userId - The user's CUID
 * @returns {Promise<number>} The maximum role level (0 if no roles assigned)
 */
const getMaxRoleLevel = async (userId) => {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        select: { level: true },
      },
    },
  });

  if (!userRoles.length) return 0;

  return Math.max(...userRoles.map((ur) => ur.role.level));
};

/**
 * Invalidate the cached permissions for a specific user.
 * Call after assigning/removing a role from this user.
 *
 * @param {string} userId - The user whose cache should be invalidated
 * @returns {Promise<void>}
 */
const invalidateUserPermissionCache = async (userId) => {
  const version = await getCacheVersion();
  const cacheKey = `${CACHE_PREFIX}:v${version}:user:${userId}`;
  await cacheDel(cacheKey);
  logger.info({ event: 'rbac.cache.invalidated', userId, cacheKey }, 'Permission cache invalidated for user');
};

/**
 * Invalidate cached permissions for every user that holds a specific role.
 * Call after modifying a role's permission set.
 *
 * @param {string} roleId - The role whose associated users should be cache-busted
 * @returns {Promise<void>}
 */
const invalidateRolePermissionCache = async (roleId) => {
  const userRoles = await prisma.userRole.findMany({
    where: { roleId },
    select: { userId: true },
  });

  await Promise.all(userRoles.map((ur) => invalidateUserPermissionCache(ur.userId)));

  logger.info(
    { event: 'rbac.cache.role_invalidated', roleId, usersAffected: userRoles.length },
    'Permission cache invalidated for all users holding role',
  );
};

export {
  getUserPermissions,
  matchesPermission,
  hasPermission,
  getMaxRoleLevel,
  invalidateUserPermissionCache,
  invalidateRolePermissionCache,
  bumpGlobalPermissionCacheVersion,
};
