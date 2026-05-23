const faker = require('faker');
const prisma = require('../../src/config/prisma');
const { userOne, userTwo } = require('./user.fixture');

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

const noteOne = {
  id: createCuid2(),
  title: faker.lorem.words(3),
  content: faker.lorem.paragraph(),
  archived: false,
  tags: ['personal', 'draft'],
  ownerId: userOne.id,
};

const noteTwo = {
  id: createCuid2(),
  title: faker.lorem.words(3),
  content: faker.lorem.paragraph(),
  archived: false,
  tags: ['work'],
  ownerId: userOne.id,
};

const noteThree = {
  id: createCuid2(),
  title: faker.lorem.words(3),
  content: faker.lorem.paragraph(),
  archived: true,
  tags: ['archive'],
  ownerId: userTwo.id,
};

/**
 * Insert mock notes into the database using atomic Prisma bulk writes.
 * @param {Array<Object>} notes
 */
const insertNotes = async (notes) => {
  let time = Date.now();
  const data = [];
  for (const note of notes) {
    data.push({
      id: note.id,
      title: note.title,
      content: note.content,
      archived: note.archived,
      tags: note.tags,
      ownerId: note.ownerId,
      createdAt: new Date(time),
      updatedAt: new Date(time),
    });
    time -= 1000;
  }
  await prisma.note.createMany({
    data,
    skipDuplicates: true,
  });
};

module.exports = {
  noteOne,
  noteTwo,
  noteThree,
  insertNotes,
};
