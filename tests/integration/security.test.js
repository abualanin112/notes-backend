import request from 'supertest';
import httpStatus from 'http-status';

import { app } from '../../src/app.js';
import setupTestDB from '../utils/setupTestDB.js';
import { prisma, resetRedisClient, getRedisClient } from '../../src/modules/infrastructure/index.js';
import * as authorizationService from '../../src/modules/iam/services/authorization.service.js';
import { userOne, userTwo, insertUsers } from '../fixtures/user.fixture.js';
import { userOneAccessToken } from '../fixtures/token.fixture.js';

setupTestDB();

describe('Security Regression & Hardening', () => {
  beforeEach(() => {
    resetRedisClient();
  });

  describe('RBAC Bypasses & Escalation', () => {
    test('should prevent vertical privilege escalation when assigning roles', async () => {
      // userTwo will be our level 50 admin
      await insertUsers([userOne, userTwo]);

      // We need a super-admin role and a standard user role in the DB to test this.
      const superAdminRole = await prisma.role.create({
        data: { name: 'super-admin-test', description: 'Super Admin', level: 100 },
      });

      const userRole = await prisma.role.create({
        data: { name: 'user-manager', description: 'User Manager', level: 10 },
      });

      // userTwo has level 50
      const adminRole = await prisma.role.create({
        data: { name: 'admin-role', description: 'Admin', level: 50 },
      });

      // Assign the 'admin-role' to 'userTwo', and give them 'assign:roles:any' permission
      await prisma.userRole.create({
        data: { userId: userTwo.id, roleId: adminRole.id, assignedBy: userTwo.id },
      });

      const assignPerm = await prisma.permission.create({
        data: { action: 'assign', resource: 'roles', scope: 'any', description: 'Assign roles' },
      });

      await prisma.rolePermission.create({
        data: { roleId: adminRole.id, permissionId: assignPerm.id },
      });

      // userTwo (level 50) tries to assign super-admin (level 100) to userOne
      // This MUST be blocked.
      const { assignRoleToUser } = authorizationService;

      await expect(assignRoleToUser({ id: userTwo.id }, userOne.id, superAdminRole.id)).rejects.toThrow(
        'Cannot assign a role with a higher privilege level than your own',
      );

      // userTwo (level 50) tries to assign user-manager (level 10) to userOne
      // This SHOULD succeed.
      const result = await assignRoleToUser({ id: userTwo.id }, userOne.id, userRole.id);
      expect(result).toBeDefined();
      expect(result.roleId).toBe(userRole.id);
    });
  });

  describe('Infrastructure Degradation', () => {
    test('should gracefully degrade to memory cache when Redis exhausts retries', async () => {
      await insertUsers([userOne]);

      // We will mock the getClient function directly instead of createClient
      // because we just want to force a Redis failure scenario

      // Simulate redisClient being created but failing and nullifying itself
      resetRedisClient();

      // Simulate the getClient behavior when Redis is unreachable and retries exhaust
      vi.spyOn({ getRedisClient }, 'getRedisClient').mockImplementation(async () => {
        // Return null to signify Redis is unavailable
        return null;
      });

      // Now, even with Redis "down", the auth middleware should still work
      // because it falls back to memory cache
      const res = await request(app).get('/v1/users').set('Authorization', `Bearer ${userOneAccessToken}`).send();

      // The user lacks permissions, so we expect 403, NOT a 500 error from Redis crash
      expect(res.status).toBe(httpStatus.FORBIDDEN);
      expect(res.body.error.message).toBe('Forbidden');

      // Restore
      vi.restoreAllMocks();
    });
  });
});
