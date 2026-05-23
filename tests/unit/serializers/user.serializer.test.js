const { serializeUser, serializeUsers } = require('../../../src/serializers/user.serializer');

describe('User Serializer', () => {
  describe('serializeUser', () => {
    test('should return null when user is null or undefined', () => {
      expect(serializeUser(null)).toBeNull();
      expect(serializeUser(undefined)).toBeNull();
    });

    test('should only return whitelisted fields and strip sensitive or legacy fields', () => {
      const mockRawUser = {
        id: 'user-id-123',
        email: 'user@example.com',
        name: 'John Doe',
        isEmailVerified: true,
        password: '$argon2id$v=19$m=65536,t=3,p=4$somehashedpassword',
        role: 'user', // legacy role
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
        extraUnwantedField: 'should-be-removed',
      };

      const serialized = serializeUser(mockRawUser);

      // Verify whitelisted fields are present and identical
      expect(serialized).toEqual({
        id: 'user-id-123',
        email: 'user@example.com',
        name: 'John Doe',
        isEmailVerified: true,
        createdAt: mockRawUser.createdAt,
        updatedAt: mockRawUser.updatedAt,
      });

      // Explicitly check for omissions
      expect(serialized).not.toHaveProperty('password');
      expect(serialized).not.toHaveProperty('role');
      expect(serialized).not.toHaveProperty('extraUnwantedField');
    });
  });

  describe('serializeUsers', () => {
    test('should return an empty array if input is not an array', () => {
      expect(serializeUsers(null)).toEqual([]);
      expect(serializeUsers(undefined)).toEqual([]);
      expect(serializeUsers({})).toEqual([]);
      expect(serializeUsers('not-an-array')).toEqual([]);
    });

    test('should map and serialize each user in the array', () => {
      const mockRawUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
          isEmailVerified: true,
          password: 'pass',
          role: 'admin',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          name: 'User Two',
          isEmailVerified: false,
          password: 'pass',
          role: 'user',
          createdAt: new Date('2026-01-02T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
        },
      ];

      const serialized = serializeUsers(mockRawUsers);

      expect(serialized).toHaveLength(2);
      expect(serialized[0]).toEqual({
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User One',
        isEmailVerified: true,
        createdAt: mockRawUsers[0].createdAt,
        updatedAt: mockRawUsers[0].updatedAt,
      });
      expect(serialized[1]).toEqual({
        id: 'user-2',
        email: 'user2@example.com',
        name: 'User Two',
        isEmailVerified: false,
        createdAt: mockRawUsers[1].createdAt,
        updatedAt: mockRawUsers[1].updatedAt,
      });
    });
  });
});
