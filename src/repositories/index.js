const prisma = require('../config/prisma');
const userRepository = require('./user.repository');
const tokenRepository = require('./token.repository');
const noteRepository = require('./note.repository');
const auditRepository = require('./audit.repository');

const runInTransaction = (callback) => prisma.$transaction(callback);

module.exports = {
  userRepository,
  tokenRepository,
  noteRepository,
  runInTransaction,
  auditRepository,
};
