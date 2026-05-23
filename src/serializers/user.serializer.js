/**
 * Explicit response serializer for User objects.
 * Prevents accidental Prisma leakage (e.g., passwords).
 *
 * @param {Object} user Raw Prisma User object
 * @returns {Object} Sanitized user DTO
 */
const serializeUser = (user) => {
  if (!user) return null;
  // Explicit whitelist mapping
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isEmailVerified: user.isEmailVerified,
    // explicitly NOT mapping `password` or legacy `role`
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
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
