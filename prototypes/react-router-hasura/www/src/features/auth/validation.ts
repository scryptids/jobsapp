/**
 * This file contains functions for validating user input during the signup and login processes.
 *
 * Checks that need the database (e.g. whether an email is already registered)
 * live in `users.server.ts`.
 * @module
 */

export const minPasswordLength = 8;

export type CredentialErrors = { email?: string; password?: string };

function validateEmail(email: string): string | undefined {
  if (!email) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Please enter a valid email address.";
  }
  return undefined;
}

export function validateSignupCreds(
  email: string,
  password: string
): CredentialErrors | null {
  const errors: CredentialErrors = {};

  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < minPasswordLength) {
    errors.password = `Password must be at least ${minPasswordLength} characters.`;
  }

  return Object.keys(errors).length ? errors : null;
}

/**
 * Login only checks presence/shape; password rules belong to sign-up so that
 * changing them never locks out existing accounts.
 */
export function validateLoginCreds(
  email: string,
  password: string
): CredentialErrors | null {
  const errors: CredentialErrors = {};

  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;

  if (!password) errors.password = "Password is required.";

  return Object.keys(errors).length ? errors : null;
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("validateSignupCreds", () => {
    it("accepts valid credentials", () => {
      expect(validateSignupCreds("a@b.co", "longenough")).toBeNull();
    });
    it("requires email and password", () => {
      expect(validateSignupCreds("", "")).toEqual({
        email: "Email is required.",
        password: "Password is required.",
      });
    });
    it("rejects malformed email and short password", () => {
      expect(validateSignupCreds("nope", "short")).toEqual({
        email: "Please enter a valid email address.",
        password: "Password must be at least 8 characters.",
      });
    });
  });

  describe("validateLoginCreds", () => {
    it("does not enforce password length", () => {
      expect(validateLoginCreds("a@b.co", "x")).toBeNull();
    });
  });
}
