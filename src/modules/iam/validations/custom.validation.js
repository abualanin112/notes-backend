const { z } = require('zod');

const cuid2 = (value) => {
  // CUID2 pattern: 25 alphanumeric characters starting with a lowercase letter
  return /^[a-z][a-z0-9]{24}$/.test(value);
};

/**
 * Reusable Zod schema helper for CUID2 identifiers
 * @param {string} fieldName - Descriptive name of the identifier field
 * @returns {z.ZodEffects<z.ZodString, string, string>}
 */
const cuid2Schema = (fieldName = 'identifier') => {
  return z.string().refine(cuid2, {
    message: `"${fieldName}" must be a valid CUID2 identifier`,
  });
};

const password = (value) => {
  if (value.length < 8) {
    return false;
  }
  if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
    return false;
  }
  return true;
};

module.exports = {
  cuid2,
  cuid2Schema,
  password,
};
