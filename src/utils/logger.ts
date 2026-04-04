// src/utils/logger.ts
// Thin logging abstraction. All application code must use this module
// instead of calling console.log / console.error directly.
// Tests mock this module to capture log output without console noise.

export const logger = {
  log: (message: string, data?: Record<string, unknown>): void => {
    console.log(message, data);
  },
  error: (message: string, data?: Record<string, unknown>): void => {
    console.error(message, data);
  },
};
