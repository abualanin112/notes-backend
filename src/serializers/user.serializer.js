/**
 * Explicit response serializer for User objects.
 * Prevents accidental Prisma leakage (e.g., passwords).
 *
 * @param {Object} user Raw Prisma User object
 * @returns {Object} Sanitized user DTO
 */
const serializeUser = (user) => {
  if (!user) return null;
  const { password: _password, ...safeUser } = user;
  return safeUser;
};

/**
 * Serialize an array of users (e.g. for pagination)
 * @param {Array} users
 * @returns {Array}
 */
const serializeUsers = (users) => {
  if (!Array.isArray(users)) return [];
  return users.map(serializeUser);
};

module.exports = {
  serializeUser,
  serializeUsers,
};
