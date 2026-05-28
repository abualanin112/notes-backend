import { runInTransaction, prisma } from '../../src/modules/infrastructure/index.js';
import { logEvent } from '../../src/modules/audit/index.js';
import { als } from '../../src/modules/shared/index.js';
import setupTestDB from '../utils/setupTestDB.js';

setupTestDB();

describe('Audit Infrastructure Integration', () => {
  describe('Metadata Sanitization & Persistence', () => {
    it('should recursively redact sensitive fields from metadata and persist', async () => {
      const payload = {
        event: 'auth.login',
        entityType: 'User',
        entityId: 'user123',
        action: 'EXECUTE',
        metadata: {
          ip: '127.0.0.1',
          user: {
            password: 'my-super-secret-password',
            refreshToken: 'refresh-token-123',
            safeData: 'hello',
          },
        },
      };

      const auditLog = await logEvent(payload);

      expect(auditLog).toBeDefined();
      expect(auditLog.event).toBe('auth.login');
      // Verify redaction without using snapshots
      expect(auditLog.metadata.user.password).toBe('[REDACTED]');
      expect(auditLog.metadata.user.refreshToken).toBe('[REDACTED]');
      expect(auditLog.metadata.user.safeData).toBe('hello');
      expect(auditLog.metadata.ip).toBe('127.0.0.1');
    });
  });

  describe('Transactional Consistency Guarantees', () => {
    it('should rollback audit records if the parent transaction fails (business failure simulation)', async () => {
      let capturedError;
      try {
        await runInTransaction(async (tx) => {
          // Write an audit log successfully inside the transaction
          await logEvent(
            {
              event: 'users.updated',
              entityType: 'User',
              entityId: 'user456',
              action: 'UPDATE',
            },
            tx,
          );

          // Simulate a critical business failure or database constraint violation occurring AFTER the audit log
          throw new Error('Business logic failed constraints!');
        });
      } catch (error) {
        capturedError = error;
      }
      expect(capturedError.message).toBe('Business logic failed constraints!');

      // Assert that the transaction cleanly rolled back the audit record

      const count = await prisma.auditLog.count();

      expect(count).toBe(0); // Proves transactional isolation is perfect
    });
  });

  describe('ALS Context Propagation', () => {
    it('should successfully extract reqId and actorId from AsyncLocalStorage without HTTP objects', async () => {
      const store = {
        reqId: 'req-uuid-999',
        userId: 'actor-uuid-777',
      };

      await als.run(store, async () => {
        const auditLog = await logEvent({
          event: 'notes.created',
          entityType: 'Note',
          entityId: 'note123',
          action: 'CREATE',
        });

        // The service should have pulled these purely from context
        expect(auditLog.reqId).toBe('req-uuid-999');
        expect(auditLog.actorId).toBe('actor-uuid-777');
      });
    });
  });
});
