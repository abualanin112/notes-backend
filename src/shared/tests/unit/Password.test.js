import { hashPassword, comparePassword } from '../../Password.js';

describe('Password Utility', () => {
  test('should hash password and verify it correctly', async () => {
    const rawPassword = 'password123';
    const hash = await hashPassword(rawPassword);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(rawPassword);

    const isMatch = await comparePassword(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isMismatch = await comparePassword('wrongpassword', hash);
    expect(isMismatch).toBe(false);
  });
});
