# Routing and Request Pipeline Analysis

## 1. Current Routing Topology

`src/routes/v1/index.js` acts as the monolithic routing hub. It centrally maps paths like `/auth`, `/users`, `/notes` to their respective route files.

- **Pipeline**: Express App -> Helmet/Cors -> Pino -> Rate Limiters -> Passport JWT -> `/v1` Router -> Controller -> Serializer -> Error Handler.

## 2. Modular Monolith Target

Routing must be decentralized. Each module should own and expose its own Router.

### 2.1 The App Shell

`src/app.js` becomes a thin "App Shell" that registers global middlewares (observability, security, errors) and then iterates over registered Modules to mount their routers.

### 2.2 Module Registration

Instead of a static `routes/v1/index.js`, we will implement a `ModuleRegistry`.

```javascript
// Example Target
const { NotesModule } = require('./modules/notes');
const { IAMModule } = require('./modules/iam');

app.use('/v1/notes', NotesModule.router);
app.use('/v1/iam', IAMModule.router);
```

### 2.3 Pipeline Hardening

- **ALS (AsyncLocalStorage)**: Context propagation for `reqId` and `userId` must remain globally applied _before_ any module router is hit.
- **Response Serialization**: The `serializeResponse` middleware currently acts globally. Each module should explicitly dictate serialization to prevent unintended data exposure, but the global interceptor can be maintained if configured safely.
- **Error Handling**: Custom `ApiError` mapping must remain centralized to guarantee a consistent API contract.
