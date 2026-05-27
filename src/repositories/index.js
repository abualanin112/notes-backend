const prisma = require('../config/prisma');
const userRepository = require('./user.repository');
const tokenRepository = require('./token.repository');
const noteRepository = require('./note.repository');
const auditRepository = require('./audit.repository');

// TODO: DANGEROUS TRANSACTION COUPLING
// This raw Prisma transaction passes global context across module boundaries.
// In Phase 7, this will be replaced with an AsyncLocalStorage (ALS) pattern or Outbox.
const runInTransaction = (callback) => prisma.$transaction(callback);

module.exports = {
  userRepository,
  tokenRepository,
  noteRepository,
  runInTransaction,
  auditRepository,
};
