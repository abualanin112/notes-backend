const bcrypt = require('bcryptjs');
const faker = require('faker');
const prisma = require('../../src/config/prisma');

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
  name: faker.name.findName(),
  email: faker.internet.email().toLowerCase(),
  password,
  role: 'user',
  isEmailVerified: false,
};

const userTwo = {
  id: createCuid2(),
  name: faker.name.findName(),
  email: faker.internet.email().toLowerCase(),
  password,
  role: 'user',
  isEmailVerified: false,
};

const admin = {
  id: createCuid2(),
  name: faker.name.findName(),
  email: faker.internet.email().toLowerCase(),
  password,
  role: 'admin',
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
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      createdAt: new Date(time),
      updatedAt: new Date(time),
    });
    time -= 1000;
  }
  await prisma.user.createMany({
    data,
    skipDuplicates: true,
  });
};

module.exports = {
  userOne,
  userTwo,
  admin,
  insertUsers,
};
