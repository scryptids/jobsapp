/**
 * Development seed data (ported from the Hasura prototype's seeds). Does
 * nothing when the database already has users, so it is safe to rerun.
 *
 *   npm run db:seed
 *
 * User 1 can also log in with dev@example.com / password when
 * DEV_AUTOLOGIN=false.
 * @module
 */

import { getDb } from "./client.server";
import { employers, positions, users } from "./schema";
import { hashPassword } from "~/features/auth/password.server";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed a production database.");
}

const db = getDb();

if (db.select({ id: users.id }).from(users).limit(1).get()) {
  console.log("Database already has users; skipping seed.");
} else {
  const passwordHash = await hashPassword("password");
  const dollars = (n: number | null) => (n === null ? null : n * 100);
  db.transaction((tx) => {
    tx.insert(users)
      .values([{ id: 1, email: "dev@example.com", passwordHash }, { id: 2 }])
      .run();
    tx.insert(employers)
      .values([
        { id: 1, name: "Evil Corp", userId: 1 },
        { id: 2, name: "NEET GmbH", userId: 1 },
        { id: 3, name: "Temple of Iron", userId: 1 },
        { id: 4, name: "Wageware", userId: 2 },
      ])
      .run();
    const job = (
      id: number,
      title: string,
      employerId: number,
      userId: number,
      lower: number | null = null,
      upper: number | null = null,
      postingUrl: string | null = null
    ) => ({
      id,
      title,
      employerId,
      userId,
      postingUrl,
      payRangeLowerCents: dollars(lower),
      payRangeUpperCents: dollars(upper),
    });
    tx.insert(positions)
      .values([
        job(1, "Worshipper", 3, 1, null, null, "https://example.com"),
        job(2, "Principal Solutions Architect", 2, 1),
        job(3, "Code Monkey", 1, 1, 30000, 40000),
        job(4, "Code Monkey", 1, 1, 30000, 40000),
        job(5, "Vice President of Global Manipulation", 1, 1, 400000, 500000),
        job(6, "Director of Corporate Espionage", 1, 1),
        job(7, "Actuary", 4, 2),
        job(8, "Software Development Engineer in Test", 4, 2),
      ])
      .run();
  });
  console.log("Seeded development data.");
}
