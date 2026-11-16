/**
 * Domain errors raised by the repository in place of raw SQLite errors.
 * @module
 */

/** An insert or update hit the unique index on users.email. */
export class UniqueEmailError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "UniqueEmailError";
  }
}

/** A row is still referenced (e.g. an employer that has jobs). */
export class ForeignKeyError extends Error {
  constructor(message = "The row is still referenced by another row.") {
    super(message);
    this.name = "ForeignKeyError";
  }
}

type SqliteError = Error & { code?: string };

function sqliteCode(e: unknown): string | undefined {
  // Drizzle wraps driver errors; the SqliteError is the cause.
  let err = e as SqliteError | undefined;
  for (let depth = 0; err && depth < 3; depth++) {
    if (typeof err.code === "string" && err.code.startsWith("SQLITE_")) return err.code;
    err = (err as { cause?: SqliteError }).cause;
  }
  return undefined;
}

function sqliteMessage(e: unknown): string {
  let err = e as SqliteError | undefined;
  const parts: string[] = [];
  for (let depth = 0; err && depth < 3; depth++) {
    parts.push(err.message);
    err = (err as { cause?: SqliteError }).cause;
  }
  return parts.join(" | ");
}

export function isUniqueViolation(e: unknown, column: string): boolean {
  return (
    sqliteCode(e) === "SQLITE_CONSTRAINT_UNIQUE" && sqliteMessage(e).includes(column)
  );
}

/**
 * SQLite reports `ON DELETE RESTRICT` refusals as SQLITE_CONSTRAINT_TRIGGER
 * and other FK failures as SQLITE_CONSTRAINT_FOREIGNKEY; both say
 * "FOREIGN KEY constraint failed".
 */
export function isForeignKeyViolation(e: unknown): boolean {
  const code = sqliteCode(e);
  return (
    code === "SQLITE_CONSTRAINT_FOREIGNKEY" ||
    (code === "SQLITE_CONSTRAINT_TRIGGER" && /FOREIGN KEY/i.test(sqliteMessage(e)))
  );
}
