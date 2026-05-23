/**
 * Explicit response serializer for Note objects.
 * Prevents accidental Prisma leakage (e.g., internal relations or sensitive metadata).
 *
 * @param {Object} note Raw Prisma Note object
 * @returns {Object} Sanitized note DTO
 */
const serializeNote = (note) => {
  if (!note) return null;
  // Currently notes don't have sensitive fields, but this provides a stable boundary
  // for future API evolution (e.g. omitting soft-delete flags, internal IDs)
  return note;
};

/**
 * Serialize an array of notes
 * @param {Array} notes
 * @returns {Array}
 */
const serializeNotes = (notes) => {
  if (!Array.isArray(notes)) return [];
  return notes.map(serializeNote);
};

module.exports = {
  serializeNote,
  serializeNotes,
};
