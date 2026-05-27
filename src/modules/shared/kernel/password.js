const bcrypt = require('bcryptjs');

/**
 * Hash a plain text password using bcryptjs
 * @param {string} password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, 8);
};

/**
 * Compare plain text password with hashed password
 * @param {string} password
 * @param {string} hashedPassword
 * @returns {Promise<boolean>} Match result
 */
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword,
};
