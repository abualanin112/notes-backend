import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import { prisma } from '../../src/infrastructure/prisma.js';

const password = 'password1';
const salt = bcrypt.genSaltSync(8);
const hashedPassword = bcrypt.hashSync(password, salt);

/**
 * Generate a compliant 25-character CUID2 format string.
 * Returns a primitive string.
 */
const createCuid2 = () => {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const userOne = {
  id: createCuid2(),
  name: faker.person.fullName(),
  email: faker.internet.email().toLowerCase(),
  password,
  roleName: 'standard_user',
  isEmailVerified: false,
};

const userTwo = {
  id: createCuid2(),
  name: faker.person.fullName(),
  email: faker.internet.email().toLowerCase(),
  password,
  roleName: 'standard_user',
  isEmailVerified: false,
};

const admin = {
  id: createCuid2(),
  name: faker.person.fullName(),
  email: faker.internet.email().toLowerCase(),
  password,
  roleName: 'super_admin',
  isEmailVerified: false,
};

const insertUsers = async (users) => {
  let time = Date.now();
  const data = [];
  for (const user of users) {
    data.push({
      id: user.id,
      name: user.name,
      email: user.email,
      password: hashedPassword,
      role: user.roleName === 'super_admin' ? 'admin' : 'user', // Kept for legacy fallback compatibility
      isEmailVerified: user.isEmailVerified,
      createdAt: new Date(time),
      updatedAt: new Date(time),
    });
    time -= 1000;
  }

  await prisma.$transaction(async (tx) => {
    // 1. Insert base users
    await tx.user.createMany({
      data,
      skipDuplicates: true,
    });

    // 2. Ensure Wildcard & Super Admin Role
    const wildcard = await tx.permission.upsert({
      where: { action_resource_scope: { action: '*', resource: '*', scope: '*' } },
      update: {},
      create: { action: '*', resource: '*', scope: '*' },
    });
    const superAdminRole = await tx.role.upsert({
      where: { name: 'super_admin' },
      update: {},
      create: { name: 'super_admin', level: 100 },
    });
    await tx.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: wildcard.id } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: wildcard.id },
    });

    // 3. Ensure Standard User Role and Permissions
    const standardRole = await tx.role.upsert({
      where: { name: 'standard_user' },
      update: {},
      create: { name: 'standard_user', level: 10 },
    });

    const userPerms = [
      { action: 'read', resource: 'notes', scope: 'own' },
      { action: 'create', resource: 'notes', scope: 'own' },
      { action: 'update', resource: 'notes', scope: 'own' },
      { action: 'delete', resource: 'notes', scope: 'own' },
      { action: 'read', resource: 'users', scope: 'own' },
      { action: 'update', resource: 'users', scope: 'own' },
      { action: 'delete', resource: 'users', scope: 'own' },
    ];

    for (const p of userPerms) {
      const perm = await tx.permission.upsert({
        where: { action_resource_scope: { action: p.action, resource: p.resource, scope: p.scope } },
        update: {},
        create: { action: p.action, resource: p.resource, scope: p.scope },
      });
      await tx.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: standardRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: standardRole.id, permissionId: perm.id },
      });
    }

    // 4. Assign Roles based on roleName property
    for (const user of users) {
      const targetRole = user.roleName === 'super_admin' ? superAdminRole : standardRole;
      await tx.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: targetRole.id } },
        update: {},
        create: { userId: user.id, roleId: targetRole.id, assignedBy: 'test-fixture' },
      });
    }
  });
};

export { userOne, userTwo, admin, insertUsers };
