// src/storage/StorageError.ts
// Typed error class for all storage layer failures.
// Thrown for: DB init failure, crypto failure, corrupt/unparseable data.
// "Not found" is NOT an error — callers receive null for missing records.

export class StorageError extends Error {
  // The underlying cause, if any (e.g. the exception thrown by op-sqlite or expo-secure-store).
  public readonly cause: unknown;

  // A machine-readable tag that callers can switch on without parsing the message string.
  public readonly tag: StorageErrorTag;

  constructor(message: string, tag: StorageErrorTag, cause?: unknown) {
    super(message);

    // Restore the prototype chain — required when extending built-in Error in TypeScript
    // targeting ES5. This is the same issue you'd see with virtual dispatch in a C++ class
    // that does not call the base constructor properly.
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = 'StorageError';
    this.tag = tag;
    this.cause = cause ?? null;
  }
}

// Discriminated union of all error categories.
// Adding a new tag here is a compile-time signal to update every switch statement
// that exhaustively handles StorageErrorTag — analogous to adding a new enum variant
// and letting the C++ compiler flag unhandled cases.
export type StorageErrorTag =
  | 'DB_INIT_FAILED'
  | 'CRYPTO_FAILED'
  | 'QUERY_FAILED'
  | 'PARSE_FAILED';
