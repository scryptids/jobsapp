/**
 * SQLite schema (Drizzle). Migrations in `drizzle/` are generated from this
 * file with `npm run db:generate`; see docs/operations for the
 * expand/contract rule every migration must follow.
 * @module
 */

import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // Stored lowercased so uniqueness is case-insensitive.
    email: text("email").unique("users_email_unique"),
    passwordHash: text("password_hash"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [check("users_email_lowercase", sql`${t.email} = lower(${t.email})`)]
);

export const employers = sqliteTable(
  "employers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name", { length: 100 }).notNull(),
    notes: text("notes"),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (t) => [index("employers_user_id_idx").on(t.userId)]
);

export const positions = sqliteTable(
  "positions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title", { length: 100 }).notNull(),
    postingUrl: text("posting_url", { length: 255 }),
    /** Whole cents; the repository converts to and from currency units. */
    payRangeLowerCents: integer("pay_range_lower_cents"),
    payRangeUpperCents: integer("pay_range_upper_cents"),
    notes: text("notes"),
    employerId: integer("employer_id").references(() => employers.id, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (t) => [
    index("positions_user_id_idx").on(t.userId),
    index("positions_employer_id_idx").on(t.employerId),
  ]
);
