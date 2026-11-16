/**
 * User account creation and credential checks, backed by Hasura.
 * @module
 */

import { ClientError } from "graphql-request";

import { adminSdk } from "~/api.server";
import { hashPassword, verifyPassword } from "./password.server";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserIdByEmail(email: string): Promise<number | null> {
  const { users } = await adminSdk.userByEmail({
    email: normalizeEmail(email),
  });
  return users[0]?.id ?? null;
}

/** Postgres' default name for the UNIQUE constraint on users.email. */
const emailUniqueConstraint = "users_email_key";

/**
 * True only when the insert failed on the email uniqueness constraint, so
 * other constraint failures (e.g. primary key) surface as real errors.
 */
function isEmailUniqueViolation(e: unknown): boolean {
  return (
    e instanceof ClientError &&
    (e.response.errors ?? []).some(
      (err) =>
        err.extensions?.code === "constraint-violation" &&
        err.message.includes(emailUniqueConstraint)
    )
  );
}

export class EmailTakenError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "EmailTakenError";
  }
}

/**
 * Create a user and return its id. Throws {@link EmailTakenError} if the
 * email is already registered (including a race between two sign-ups).
 */
export async function createUser(
  email: string,
  password: string
): Promise<number> {
  const passwordHash = await hashPassword(password);
  try {
    const { insert_users_one } = await adminSdk.insertUser({
      email: normalizeEmail(email),
      passwordHash,
    });
    if (!insert_users_one) throw new Error("User insert returned no row.");
    return insert_users_one.id;
  } catch (e) {
    if (isEmailUniqueViolation(e)) throw new EmailTakenError();
    throw e;
  }
}

/**
 * Return the user id when the email and password match, otherwise null.
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<number | null> {
  const { users } = await adminSdk.userByEmail({
    email: normalizeEmail(email),
  });
  const user = users[0];
  if (!user?.password_hash) {
    // Spend comparable time so response timing doesn't reveal which emails
    // are registered.
    await hashPassword(password);
    return null;
  }
  return (await verifyPassword(password, user.password_hash)) ? user.id : null;
}
