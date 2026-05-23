import { describe, it, expect, vi, beforeEach } from 'vitest';
import httpStatus from 'http-status';
import auth from '../../../src/middlewares/auth';
import ApiError from '../../../src/utils/ApiError';
import permissionService from '../../../src/services/permission.service';

// Mock passport so we can inject a mock user directly into the middleware flow
vi.mock('passport', () => ({
  default: {
    authenticate: vi.fn((strategy, options, callback) => (req, res, next) => {
      // In our tests, req.mockUser controls whether authentication succeeds
      if (req.mockUser) {
        callback(null, req.mockUser, null);
      } else {
        callback(new Error('Auth failed'), null, null);
      }
    }),
  }
}));

vi.mock('../../../src/services/permission.service', () => ({
  default: {
    getUserPermissions: vi.fn(),
    matchesPermission: vi.fn((granted, required) => {
      if (granted.has(required)) return true;
      if (granted.has('*:*:*')) return true;
      if (required.endsWith(':own')) {
        const anyVariant = required.replace(/:own$/, ':any');
        if (granted.has(anyVariant)) return true;
      }
      return false;
    })
  },
  getUserPermissions: vi.fn(),
  matchesPermission: vi.fn((granted, required) => {
      if (granted.has(required)) return true;
      if (granted.has('*:*:*')) return true;
      if (required.endsWith(':own')) {
        const anyVariant = required.replace(/:own$/, ':any');
        if (granted.has(anyVariant)) return true;
      }
      return false;
    })
}));

describe('Auth Middleware (Vitest)', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { mockUser: { id: 'user-id-123', email: 'test@example.com' } };
    res = {};
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('should authenticate user and call next if no permissions are required', async () => {
    const middleware = auth(); // No permissions required
    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual(req.mockUser);
    expect(permissionService.getUserPermissions).not.toHaveBeenCalled();
  });

  it('should call next with ApiError if authentication fails', async () => {
    req.mockUser = null; // simulate failed authentication
    const middleware = auth();
    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should call next and allow access if user has exact required permission', async () => {
    permissionService.getUserPermissions.mockResolvedValue(new Set(['read:notes:own']));
    const middleware = auth('read:notes:own');
    await middleware(req, res, next);
    expect(permissionService.getUserPermissions).toHaveBeenCalledWith('user-id-123');
    expect(next).toHaveBeenCalledWith();
  });

  it('should block access with 403 FORBIDDEN if user lacks required permission', async () => {
    permissionService.getUserPermissions.mockResolvedValue(new Set(['read:notes:own']));
    const middleware = auth('update:notes:own'); // Missing permission
    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(httpStatus.FORBIDDEN);
  });

  it('should allow access if user has super admin wildcard (*:*:*)', async () => {
    permissionService.getUserPermissions.mockResolvedValue(new Set(['*:*:*']));
    const middleware = auth('update:notes:own');
    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should evaluate scope escalation: having :any allows :own requirements', async () => {
    permissionService.getUserPermissions.mockResolvedValue(new Set(['update:notes:any']));
    const middleware = auth('update:notes:own'); // Requires :own, user has :any
    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith(); // Allowed due to escalation
  });

  it('should block scope downgrade: having :own does not satisfy :any requirements', async () => {
    permissionService.getUserPermissions.mockResolvedValue(new Set(['update:notes:own']));
    const middleware = auth('update:notes:any'); // Requires :any, user only has :own
    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(httpStatus.FORBIDDEN);
  });

  it('should handle internal errors gracefully during permission resolution', async () => {
    permissionService.getUserPermissions.mockRejectedValue(new Error('Redis failure'));
    const middleware = auth('read:notes:own');
    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(httpStatus.INTERNAL_SERVER_ERROR);
    expect(next.mock.calls[0][0].message).toBe('Permission check failed');
  });

  it('should strictly require ALL permissions passed to the middleware', async () => {
    permissionService.getUserPermissions.mockResolvedValue(new Set(['read:notes:any']));
    // User is missing the second permission
    const middleware = auth('read:notes:any', 'update:notes:any');
    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(httpStatus.FORBIDDEN);
  });
});
