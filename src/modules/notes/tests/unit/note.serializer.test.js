import { serializeNote, serializeNotes } from '../../note.serializer.js';

describe('Note Serializer', () => {
  describe('serializeNote', () => {
    test('should return null when note is null or undefined', () => {
      expect(serializeNote(null)).toBeNull();
      expect(serializeNote(undefined)).toBeNull();
    });

    test('should only return whitelisted fields and strip relations/unwanted metadata', () => {
      const mockRawNote = {
        id: 'note-id-123',
        title: 'Meeting Notes',
        content: 'Discussed project roadmap and RBAC refactoring.',
        archived: false,
        tags: ['work', 'rbac'],
        ownerId: 'owner-id-456',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
        owner: {
          id: 'owner-id-456',
          name: 'John Doe',
          email: 'john@example.com',
        }, // Relation that should be stripped by default unless explicitly included/handled
        secretMeta: 'sensitive-internal-value',
      };

      const serialized = serializeNote(mockRawNote);

      expect(serialized).toEqual({
        id: 'note-id-123',
        title: 'Meeting Notes',
        content: 'Discussed project roadmap and RBAC refactoring.',
        archived: false,
        tags: ['work', 'rbac'],
        ownerId: 'owner-id-456',
        createdAt: mockRawNote.createdAt,
        updatedAt: mockRawNote.updatedAt,
      });

      expect(serialized).not.toHaveProperty('owner');
      expect(serialized).not.toHaveProperty('secretMeta');
    });
  });

  describe('serializeNotes', () => {
    test('should return an empty array if input is not an array', () => {
      expect(serializeNotes(null)).toEqual([]);
      expect(serializeNotes(undefined)).toEqual([]);
      expect(serializeNotes({})).toEqual([]);
      expect(serializeNotes('not-an-array')).toEqual([]);
    });

    test('should map and serialize each note in the array', () => {
      const mockRawNotes = [
        {
          id: 'note-1',
          title: 'Note 1',
          content: 'Content 1',
          archived: false,
          tags: [],
          ownerId: 'owner-1',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'note-2',
          title: 'Note 2',
          content: 'Content 2',
          archived: true,
          tags: ['personal'],
          ownerId: 'owner-1',
          createdAt: new Date('2026-01-02T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
        },
      ];

      const serialized = serializeNotes(mockRawNotes);

      expect(serialized).toHaveLength(2);
      expect(serialized[0]).toEqual({
        id: 'note-1',
        title: 'Note 1',
        content: 'Content 1',
        archived: false,
        tags: [],
        ownerId: 'owner-1',
        createdAt: mockRawNotes[0].createdAt,
        updatedAt: mockRawNotes[0].updatedAt,
      });
      expect(serialized[1]).toEqual({
        id: 'note-2',
        title: 'Note 2',
        content: 'Content 2',
        archived: true,
        tags: ['personal'],
        ownerId: 'owner-1',
        createdAt: mockRawNotes[1].createdAt,
        updatedAt: mockRawNotes[1].updatedAt,
      });
    });
  });
});
