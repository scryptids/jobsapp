/**
 * Types and objects related to cookies.
 * @module cookies
 */

import { createCookie } from "react-router";

/**
 * Cookie signing secrets, newest first. `COOKIE_SECRETS` is a comma-separated
 * list so a new secret can be prepended while cookies signed with older ones
 * still verify (see the RotateCookieSecret runbook).
 */
export function cookieSecrets(): string[] {
  const raw = process.env.COOKIE_SECRETS ?? process.env.COOKIE_SECRET ?? "";
  const secrets = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (secrets.length) return secrets;
  if (process.env.NODE_ENV === "production") {
    throw new Error("COOKIE_SECRETS must be set in production.");
  }
  if (!warnedInsecureSecret) {
    console.warn("🚨 No COOKIE_SECRETS set, using an insecure development secret.");
    warnedInsecureSecret = true;
  }
  return ["default-secret"];
}
let warnedInsecureSecret = false;
/** How long a paused multi-step flow (e.g. waiting for an OTP) stays alive. */
export const machineCookieMaxAgeSeconds = 10 * 60;

/**
 * A cookie that stores the persisted snapshot of the login state machine
 * between requests. Signed, so it can't be tampered with, but readable by the
 * client, so it must never hold secrets.
 */
export const loginMachineCookie = createCookie("_login", {
  secrets: cookieSecrets(),
  maxAge: machineCookieMaxAgeSeconds,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/login",
});
