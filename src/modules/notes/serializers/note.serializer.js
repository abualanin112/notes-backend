/**
 * Explicit response serializer for Note objects.
 * Prevents accidental Prisma leakage (e.g., internal relations or sensitive metadata).
 *
 * @param {Object} note Raw Prisma Note object
 * @returns {Object} Sanitized note DTO
 */
const serializeNote = (note) => {
  if (!note) return null;
  // Explicit whitelist mapping
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    archived: note.archived,
    tags: note.tags,
    ownerId: note.ownerId,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
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
