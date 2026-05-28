import { AsyncLocalStorage } from 'async_hooks';

const ALS_SYMBOL = Symbol.for('notes-backend.shared.als.singleton');

// eslint-disable-next-line security/detect-object-injection
if (!global[ALS_SYMBOL]) {
  // eslint-disable-next-line security/detect-object-injection
  global[ALS_SYMBOL] = new AsyncLocalStorage();
}

// eslint-disable-next-line security/detect-object-injection
export const als = global[ALS_SYMBOL];
