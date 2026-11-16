/**
 * Sign-up machine wired to the real user store.
 * @module
 */

import { fromPromise } from "xstate";

import { signupMachine, type CreateUserResult } from "./signupMachine";
import { logFailures } from "~/utils/logFailures.server";
import { createUser, EmailTakenError } from "./users.server";

export const serverSignupMachine = signupMachine.provide({
  actors: {
    createUser: fromPromise<CreateUserResult, { email: string; password: string }>(
      ({ input }) =>
        logFailures("Failed to create user", async (): Promise<CreateUserResult> => {
          try {
            return { ok: true, userId: await createUser(input.email, input.password) };
          } catch (e) {
            if (e instanceof EmailTakenError) return { ok: false, reason: "email-taken" };
            throw e;
          }
        })
    ),
  },
});
