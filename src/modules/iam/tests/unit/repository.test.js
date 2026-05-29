import { create as createUser, findByEmail } from '../../repositories/user.repository.js';
import { create as createToken, deleteExpiredTokens } from '../../repositories/token.repository.js';
import { create as createNote } from '../../../notes/note.repository.js';

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
      await createUser(userData, mockTx);
      expect(mockTx.user.create).toHaveBeenCalledWith({ data: userData });
    });

    test('should call prisma.user.findUnique with password omitted by default', async () => {
      await findByEmail('test@example.com', {}, mockTx);
      expect(mockTx.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        omit: { password: true },
      });
    });

    test('should call prisma.user.findUnique with password included when explicitly requested', async () => {
      await findByEmail('test@example.com', { includePassword: true }, mockTx);
      expect(mockTx.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        omit: { password: false },
      });
    });
  });

  describe('Token Repository', () => {
    test('should call prisma.token.create and connect user relation', async () => {
      const tokenData = { token: 'jwt123', type: 'refresh', userId: 'user123' };
      await createToken(tokenData, mockTx);
      expect(mockTx.token.create).toHaveBeenCalledWith({
        data: {
          token: 'jwt123',
          type: 'refresh',
          user: { connect: { id: 'user123' } },
        },
      });
    });

    test('should batch delete expired tokens in a loop until none are found', async () => {
      mockTx.token.findMany = vi
        .fn()
        .mockResolvedValueOnce([{ id: 't1' }, { id: 't2' }])
        .mockResolvedValueOnce([]);
      mockTx.token.deleteMany = vi.fn().mockResolvedValue({ count: 2 });

      const result = await deleteExpiredTokens(mockTx);

      expect(result).toEqual({ count: 2 });
      expect(mockTx.token.findMany).toHaveBeenCalledTimes(2);
      expect(mockTx.token.deleteMany).toHaveBeenCalledTimes(1);
      expect(mockTx.token.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['t1', 't2'] } },
      });
    });
  });

  describe('Note Repository', () => {
    test('should call prisma.note.create and connect owner relation', async () => {
      const noteData = { title: 'Hello', content: 'World', ownerId: 'user123' };
      await createNote(noteData, mockTx);
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
