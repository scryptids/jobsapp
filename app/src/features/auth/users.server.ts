/**
 * User account creation and credential checks.
 * @module
 */

import { UniqueEmailError } from "~/db/errors";
import { usersRepo } from "~/db/repository.server";
import { hashPassword, verifyPassword } from "./password.server";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserIdByEmail(email: string): Promise<number | null> {
  const user = await usersRepo.byEmail(normalizeEmail(email));
  return user?.id ?? null;
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
    return await usersRepo.insert(normalizeEmail(email), passwordHash);
  } catch (e) {
    if (e instanceof UniqueEmailError) throw new EmailTakenError();
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
  const user = await usersRepo.byEmail(normalizeEmail(email));
  if (!user?.passwordHash) {
    // Spend comparable time so response timing doesn't reveal which emails
    // are registered.
    await hashPassword(password);
    return null;
  }
  return (await verifyPassword(password, user.passwordHash)) ? user.id : null;
}
