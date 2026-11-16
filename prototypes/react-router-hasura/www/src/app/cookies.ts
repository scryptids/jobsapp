/**
 * Types and objects related to cookies.
 * @module cookies
 */

import { createCookie } from "react-router";

/** How long a paused multi-step flow (e.g. waiting for an OTP) stays alive. */
export const machineCookieMaxAgeSeconds = 10 * 60;

/**
 * A cookie that stores the persisted snapshot of the login state machine
 * between requests. Signed, so it can't be tampered with, but readable by the
 * client, so it must never hold secrets.
 */
export const loginMachineCookie = createCookie("_login", {
  secrets: [process.env.COOKIE_SECRET || "default-secret"],
  maxAge: machineCookieMaxAgeSeconds,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/login",
});
