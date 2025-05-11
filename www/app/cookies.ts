/**
 * Types and objects related to cookies.
 * @module cookies
 */

import { createCookie } from "react-router";

/**
 * A cookie that stores the state of the signup state machine.
 */
export const signupMachineCookie = createCookie("_signup", {
  secrets: ["rMPqDFj3iMA="],
});

/**
 * A cookie that stores the state of the login state machine.
 */
export const loginMachineCookie = createCookie("_login", {
  secrets: ["rMPqDFj3iMA="],
});
