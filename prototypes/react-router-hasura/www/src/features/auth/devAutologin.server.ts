/**
 * Development auto-login.
 *
 * In development, visiting /login signs you straight in as the seeded user so
 * day-to-day work needs no credentials. Set `DEV_AUTOLOGIN=false` to exercise
 * the real email/password flow locally. Never active in production.
 * @module
 */

export const devAutologinUserId = 1;

export function isDevAutologinEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTOLOGIN !== "false"
  );
}
