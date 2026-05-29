# Redis Infrastructure

## Overview

Redis is used for high-speed caching, rate limiting, and pub/sub.

## Best Practices

1. **Graceful Degradation:** Redis is configured with circuit breakers. If Redis goes down, the application will degrade gracefully (e.g., bypassing cache) rather than crashing entirely.
2. **Connection:** Always use the exported client from `src/infrastructure/redis.js`.
3. **Key Naming Strategy:** Keys must be namespaced using colons to indicate domain and type (e.g., `rate-limit:auth:login:{ip}`).
4. **Time-To-Live (TTL):** Every key stored in Redis **MUST** have an explicit TTL. Never store persistent unbounded data in Redis.
