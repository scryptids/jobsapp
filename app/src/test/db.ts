/**
 * Test helpers over the real SQLite database. Vitest runs each test file in
 * its own module graph and `DATABASE_PATH` is `:memory:` in tests (see
 * vite.config.ts), so every file gets a fresh, fully migrated database.
 *
 * Rows are returned with column names (`user_id`, `employer_id`, ...) so
 * assertions read like the table.
 * @module
 */

import { vi } from "vitest";

import { getDb } from "~/db/client.server";

function sqlite() {
  return getDb().$client;
}

export type UserRow = { id: number; email: string | null; password_hash: string | null };
export type EmployerRow = { id: number; name: string; notes: string | null; user_id: number };
export type PositionRow = {
  id: number;
  title: string;
  posting_url: string | null;
  pay_range_lower: number | null;
  pay_range_upper: number | null;
  notes: string | null;
  employer_id: number | null;
  user_id: number;
};

export const testDb = {
  /** Delete all rows and reset ids, then create bare users with these ids. */
  reset(...userIds: number[]) {
    const db = sqlite();
    db.exec(`
      DELETE FROM positions;
      DELETE FROM employers;
      DELETE FROM users;
      DELETE FROM sqlite_sequence;
    `);
    const insert = db.prepare("INSERT INTO users (id) VALUES (?)");
    for (const id of userIds) insert.run(id);
  },

  insertUser(user: { id: number; email: string; password_hash: string }) {
    sqlite()
      .prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)")
      .run(user.id, user.email, user.password_hash);
  },

  users(): UserRow[] {
    return sqlite()
      .prepare("SELECT id, email, password_hash FROM users WHERE email IS NOT NULL ORDER BY id")
      .all() as UserRow[];
  },

  employers(): EmployerRow[] {
    return sqlite()
      .prepare("SELECT id, name, notes, user_id FROM employers ORDER BY id")
      .all() as EmployerRow[];
  },

  positions(): PositionRow[] {
    return sqlite()
      .prepare(
        `SELECT id, title, posting_url,
                pay_range_lower_cents / 100.0 AS pay_range_lower,
                pay_range_upper_cents / 100.0 AS pay_range_upper,
                notes, employer_id, user_id
         FROM positions ORDER BY id`
      )
      .all() as PositionRow[];
  },
};

/** Make the next call of `object[method]` reject with a generic error. */
export function failNext<T extends object>(object: T, method: keyof T & string) {
  (vi.spyOn(object, method as never) as unknown as {
    mockRejectedValueOnce(e: Error): void;
  }).mockRejectedValueOnce(new Error(`injected failure in ${method}`));
}
