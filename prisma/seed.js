const { PrismaClient } = require('@prisma/client');
const logger = require('../src/config/logger');

const prisma = new PrismaClient();

async function main() {
  logger.info('Starting RBAC Bootstrap...');

  // 1. Create the global wildcard permission
  const wildcardPermission = await prisma.permission.upsert({
    where: {
      action_resource_scope: {
        action: '*',
        resource: '*',
        scope: '*',
      },
    },
    update: {},
    create: {
      action: '*',
      resource: '*',
      scope: '*',
      description: 'Global Wildcard - Grants all permissions across the system.',
    },
  });
  logger.info(`Wildcard permission ensured: ${wildcardPermission.id}`);

  // 2. Create the super_admin role (Level 100)
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'super_admin' },
    update: {},
    create: {
      name: 'super_admin',
      description: 'System Administrator with unrestricted access.',
      level: 100,
      isSystem: true,
    },
  });
  logger.info(`Super admin role ensured: ${superAdminRole.id}`);

  // 3. Link Wildcard Permission to Super Admin Role
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: superAdminRole.id,
        permissionId: wildcardPermission.id,
      },
    },
    update: {},
    create: {
      roleId: superAdminRole.id,
      permissionId: wildcardPermission.id,
    },
  });
  logger.info('RolePermission link established.');

  // 4. Find or Create the Default Admin User
  // Assuming a default admin email is provided via ENV or we find the first legacy 'admin'
  let adminUser = await prisma.user.findFirst({
    where: { role: 'admin' },
  });

  if (!adminUser) {
    logger.warn('No legacy admin user found. Creating a default admin user...');
    // Note: In production, password should be hashed. Using a placeholder for bootstrap.
    adminUser = await prisma.user.create({
      data: {
        name: 'System Admin',
        email: 'admin@system.local',
        password: 'ChangeMe123!', // Ensure this gets hashed in real implementation
        role: 'admin',
        isEmailVerified: true,
      },
    });
  }

  // 5. Assign the super_admin role to the Admin User
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: superAdminRole.id,
      assignedBy: 'system-bootstrap',
    },
  });
  logger.info(`Bootstrap complete! User ${adminUser.email} is now a super_admin.`);
}

main()
  .catch((e) => {
    logger.error({ err: e }, 'Bootstrap failed');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
