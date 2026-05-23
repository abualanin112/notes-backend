const { userRepository, tokenRepository, noteRepository } = require('../../../src/repositories');

describe('Repositories Layer', () => {
  let mockTx;

  beforeEach(() => {
    mockTx = {
      user: {
        create: vi.fn().mockResolvedValue({ id: 'user123' }),
        findUnique: vi.fn().mockResolvedValue({ id: 'user123' }),
        findFirst: vi.fn().mockResolvedValue({ id: 'user123' }),
        update: vi.fn().mockResolvedValue({ id: 'user123' }),
        delete: vi.fn().mockResolvedValue({ id: 'user123' }),
      },
      token: {
        create: vi.fn().mockResolvedValue({ id: 'token123' }),
        findFirst: vi.fn().mockResolvedValue({ id: 'token123' }),
        delete: vi.fn().mockResolvedValue({ id: 'token123' }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      note: {
        create: vi.fn().mockResolvedValue({ id: 'note123' }),
        findUnique: vi.fn().mockResolvedValue({ id: 'note123' }),
        update: vi.fn().mockResolvedValue({ id: 'note123' }),
        delete: vi.fn().mockResolvedValue({ id: 'note123' }),
      },
    };
  });

  describe('User Repository', () => {
    test('should call prisma.user.create with correct data', async () => {
      const userData = { name: 'Test', email: 'test@example.com' };
      await userRepository.create(userData, mockTx);
      expect(mockTx.user.create).toHaveBeenCalledWith({ data: userData });
    });

    test('should call prisma.user.findUnique with password omitted by default', async () => {
      await userRepository.findByEmail('test@example.com', {}, mockTx);
      expect(mockTx.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        omit: { password: true },
      });
    });

    test('should call prisma.user.findUnique with password included when explicitly requested', async () => {
      await userRepository.findByEmail('test@example.com', { includePassword: true }, mockTx);
      expect(mockTx.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        omit: { password: false },
      });
    });
  });

  describe('Token Repository', () => {
    test('should call prisma.token.create and connect user relation', async () => {
      const tokenData = { token: 'jwt123', type: 'refresh', userId: 'user123' };
      await tokenRepository.create(tokenData, mockTx);
      expect(mockTx.token.create).toHaveBeenCalledWith({
        data: {
          token: 'jwt123',
          type: 'refresh',
          user: { connect: { id: 'user123' } },
        },
      });
    });
  });

  describe('Note Repository', () => {
    test('should call prisma.note.create and connect owner relation', async () => {
      const noteData = { title: 'Hello', content: 'World', ownerId: 'user123' };
      await noteRepository.create(noteData, mockTx);
      expect(mockTx.note.create).toHaveBeenCalledWith({
        data: {
          title: 'Hello',
          content: 'World',
          owner: { connect: { id: 'user123' } },
        },
      });
    });
  });
});
