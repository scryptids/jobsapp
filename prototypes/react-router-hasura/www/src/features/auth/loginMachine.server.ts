/**
 * Log-in machine wired to the real user store. No second factor yet:
 * `secondFactorEnabled` keeps its default (false).
 * @module
 */

import { fromPromise } from "xstate";

import { loginMachine } from "./loginMachine";
import { logFailures } from "~/utils/logFailures.server";
import { authenticateUser } from "./users.server";

export const serverLoginMachine = loginMachine.provide({
  actors: {
    authenticateUser: fromPromise<number | null, { email: string; password: string }>(
      ({ input }) =>
        logFailures("Failed to authenticate user", () =>
          authenticateUser(input.email, input.password)
        )
    ),
  },
});
