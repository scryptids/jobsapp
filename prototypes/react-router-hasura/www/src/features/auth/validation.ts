/**
 * This file contains functions for validating user input during the signup and login processes.
 *
 * @module
 */

export async function accountExists(email: string): Promise<boolean> {
  await new Promise((resolve) => resolve(null));
  return false;
}

export async function validateSignupCreds(email: string, password: string) {
  const errors: { email?: string; password?: string } = {};

  if (!email) {
    errors.email = "Email is required.";
  } else if (!email.includes("@")) {
    errors.email = "Please enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  }

  if (!errors.email && (await accountExists(email))) {
    errors.email = "An account with this email already exists.";
  }

  return Object.keys(errors).length ? errors : null;
}

export function validateLoginCreds(email: string, password: string) {
  let errors: { email?: string; password?: string } = {};

  if (!email) {
    errors.email = "Email is required.";
  } else if (!email.includes("@")) {
    errors.email = "Please enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  return Object.keys(errors).length ? errors : null;
}
