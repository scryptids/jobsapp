/**
 * Sign-up use case as a state machine.
 *
 * ```
 * awaitingCredentials ──credentials.submit──▶ (invalid) awaitingCredentials
 *                                          └▶ creatingUser
 * creatingUser ──created──▶ registered (final)
 *              ──email taken / error──▶ awaitingCredentials
 * ```
 *
 * Pure definition: side effects are named actors whose defaults throw.
 * `signupMachine.server.ts` provides the real ones; tests provide stubs.
 * @module
 */

import { assign, fromPromise, setup } from "xstate";

import { validateSignupCreds, type CredentialErrors } from "./validation";

export type SignupEvent = {
  type: "credentials.submit";
  email: string;
  password: string;
};

export type CreateUserResult =
  | { ok: true; userId: number }
  | { ok: false; reason: "email-taken" };

export type SignupProblem = "invalidInput" | "emailTaken" | "unavailable";

export type SignupContext = {
  email: string;
  fieldErrors: CredentialErrors | null;
  problem: SignupProblem | null;
  userId: number | null;
};

export const signupMachine = setup({
  types: {
    context: {} as SignupContext,
    events: {} as SignupEvent,
    output: {} as { userId: number | null },
  },
  actors: {
    createUser: fromPromise<CreateUserResult, { email: string; password: string }>(
      async () => {
        throw new Error("createUser actor not provided");
      }
    ),
  },
  guards: {
    credentialsInvalid: ({ event }) =>
      validateSignupCreds(event.email, event.password) !== null,
  },
}).createMachine({
  id: "signup",
  context: { email: "", fieldErrors: null, problem: null, userId: null },
  initial: "awaitingCredentials",
  states: {
    awaitingCredentials: {
      tags: ["pause"],
      on: {
        "credentials.submit": [
          {
            guard: "credentialsInvalid",
            actions: assign(({ event }) => ({
              email: event.email,
              fieldErrors: validateSignupCreds(event.email, event.password),
              problem: "invalidInput" as const,
            })),
          },
          {
            target: "creatingUser",
            actions: assign(({ event }) => ({
              email: event.email,
              fieldErrors: null,
              problem: null,
            })),
          },
        ],
      },
    },
    creatingUser: {
      invoke: {
        src: "createUser",
        // The password goes straight from the event to the actor and is
        // never stored in context.
        input: ({ event }) => {
          const { email, password } = event as SignupEvent;
          return { email, password };
        },
        onDone: [
          {
            guard: ({ event }) => event.output.ok,
            target: "registered",
            actions: assign({
              userId: ({ event }) =>
                event.output.ok ? event.output.userId : null,
            }),
          },
          {
            target: "awaitingCredentials",
            actions: assign({
              fieldErrors: {
                email: "An account with this email already exists.",
              },
              problem: "emailTaken",
            }),
          },
        ],
        onError: {
          target: "awaitingCredentials",
          actions: assign({ problem: "unavailable" }),
        },
      },
    },
    registered: {
      type: "final",
      tags: ["success"],
    },
  },
  output: ({ context }) => ({ userId: context.userId }),
});
