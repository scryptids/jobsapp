/**
 * The SQLite connection. There is exactly one current connection per
 * process; the writer coordinator (`~/ops/writer.server`) swaps it when a
 * task is promoted to writer or frozen. Outside a deployment (dev, tests)
 * the first `getDb()` opens `DATABASE_PATH` read-write and migrates it.
 * @module
 */

import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

export type DbHandle = {
  db: Db;
  path: string;
  readonly: boolean;
};

/**
 * The current handle lives on `globalThis` because the custom server and the
 * React Router build are bundled separately; both must see the same one.
 */
const slot = globalThis as typeof globalThis & { __jobsappDb?: DbHandle | null };

/** Folder holding the drizzle-kit migrations, in dev and in the image. */
export function migrationsFolder(): string {
  return process.env.MIGRATIONS_DIR ?? path.resolve(process.cwd(), "drizzle");
}

/**
 * Open a database file with the pragmas Litestream and the app rely on.
 * Read-only handles refuse every write at the SQLite level, which is the
 * hard guarantee behind standby and frozen tasks.
 */
export function openDatabase(file: string, { readonly = false } = {}): DbHandle {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file, { readonly, fileMustExist: readonly });
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  if (!readonly) {
    // Litestream requires WAL mode.
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("synchronous = NORMAL");
  }
  return { db: drizzle(sqlite, { schema }) as Db, path: file, readonly };
}

export function runMigrations(handle: DbHandle): void {
  if (handle.readonly) throw new Error("Cannot migrate a read-only database.");
  migrate(handle.db, { migrationsFolder: migrationsFolder() });
}

/** Run SQLite's integrity check; throws unless it reports "ok". */
export function assertIntegrity(handle: DbHandle): void {
  const rows = handle.db.$client.pragma("integrity_check") as { integrity_check: string }[];
  const problems = rows.map((r) => r.integrity_check).filter((r) => r !== "ok");
  if (problems.length) throw new Error(`integrity_check failed: ${problems.join("; ")}`);
}

/** Replace the process's connection, closing the previous one. */
export function setDatabase(handle: DbHandle | null): void {
  const previous = slot.__jobsappDb ?? null;
  slot.__jobsappDb = handle;
  if (previous && previous !== handle) previous.db.$client.close();
}

export function currentDatabase(): DbHandle | null {
  return slot.__jobsappDb ?? null;
}

/** The current connection, opening `DATABASE_PATH` on first use outside a deployment. */
export function getDb(): Db {
  let handle = slot.__jobsappDb;
  if (!handle) {
    if (process.env.WRITER_COORDINATION === "s3") {
      throw new Error("Database not ready: the writer coordinator has not opened it yet.");
    }
    handle = openDatabase(process.env.DATABASE_PATH ?? "./data/dev.db");
    runMigrations(handle);
    slot.__jobsappDb = handle;
  }
  return handle.db;
}

/** Whether writes are currently accepted by this process. */
export function isWritable(): boolean {
  if (process.env.WRITER_COORDINATION !== "s3") return true;
  const handle = slot.__jobsappDb;
  return !!handle && !handle.readonly;
}
