/**
 * Log-in use case as a state machine.
 *
 * ```
 * start ──[autologin]──▶ authenticated
 *       └──────────────▶ awaitingCredentials
 * awaitingCredentials ──credentials.submit──▶ (invalid) awaitingCredentials
 *                                          └▶ authenticating
 * authenticating ──user──▶ checkingSecondFactor
 *                ──no user──▶ awaitingCredentials | lockedOut (max attempts)
 * checkingSecondFactor ──[second factor]──▶ awaitingOtp
 *                      └─────────────────▶ authenticated
 * awaitingOtp ──otp.submit──▶ verifyingOtp
 * verifyingOtp ──ok──▶ authenticated
 *              ──bad──▶ awaitingOtp | lockedOut (max attempts)
 * ```
 *
 * The flow can span several requests: the route persists the paused
 * snapshot (`pause` tag) in a cookie and resumes it on the next submission.
 * The context therefore holds no secrets; passwords and codes travel only in
 * events and actor input.
 *
 * `lockedOut` is deliberately not final: it stays in the cookie until the
 * cookie expires. That is a soft limit (clearing cookies resets it); real
 * protection needs a server-side counter.
 *
 * Pure definition: side effects are named actors whose defaults throw, and
 * `secondFactorEnabled` defaults to false. `loginMachine.server.ts` provides
 * the real implementations; tests provide stubs.
 * @module
 */

import { assign, fromPromise, setup } from "xstate";

import { validateLoginCreds, type CredentialErrors } from "./validation";

export const defaultMaxLoginAttempts = 5;

export type LoginEvent =
  | { type: "credentials.submit"; email: string; password: string }
  | { type: "otp.submit"; otp: string };

export type LoginProblem =
  | "invalidInput"
  | "badCredentials"
  | "badOtp"
  | "unavailable";

export type LoginInput = {
  /** Development only: sign straight in as this user. */
  autologinUserId?: number | null;
  maxAttempts?: number;
};

export type LoginContext = {
  email: string;
  userId: number | null;
  attempts: number;
  maxAttempts: number;
  fieldErrors: CredentialErrors | null;
  problem: LoginProblem | null;
};

export const loginMachine = setup({
  types: {
    context: {} as LoginContext,
    events: {} as LoginEvent,
    input: {} as LoginInput | undefined,
    output: {} as { userId: number | null },
  },
  actors: {
    /** Resolves to the user id, or null when the credentials don't match. */
    authenticateUser: fromPromise<number | null, { email: string; password: string }>(
      async () => {
        throw new Error("authenticateUser actor not provided");
      }
    ),
    /** Resolves to whether the one-time code is valid for the user. */
    verifyOtp: fromPromise<boolean, { userId: number; otp: string }>(async () => {
      throw new Error("verifyOtp actor not provided");
    }),
  },
  guards: {
    autologin: ({ context }) => context.userId !== null,
    credentialsInvalid: ({ event }) =>
      event.type === "credentials.submit" &&
      validateLoginCreds(event.email, event.password) !== null,
    lastAttempt: ({ context }) => context.attempts + 1 >= context.maxAttempts,
    secondFactorEnabled: () => false,
  },
  actions: {
    countFailure: assign({ attempts: ({ context }) => context.attempts + 1 }),
  },
}).createMachine({
  id: "login",
  context: ({ input }) => ({
    email: "",
    userId: input?.autologinUserId ?? null,
    attempts: 0,
    maxAttempts: input?.maxAttempts ?? defaultMaxLoginAttempts,
    fieldErrors: null,
    problem: null,
  }),
  initial: "start",
  states: {
    start: {
      always: [
        { guard: "autologin", target: "authenticated" },
        { target: "awaitingCredentials" },
      ],
    },

    awaitingCredentials: {
      tags: ["pause"],
      on: {
        "credentials.submit": [
          {
            guard: "credentialsInvalid",
            actions: assign(({ event }) => ({
              email: event.email,
              fieldErrors: validateLoginCreds(event.email, event.password),
              problem: "invalidInput" as const,
            })),
          },
          {
            target: "authenticating",
            actions: assign(({ event }) => ({
              email: event.email,
              fieldErrors: null,
              problem: null,
            })),
          },
        ],
      },
    },

    authenticating: {
      invoke: {
        src: "authenticateUser",
        input: ({ event }) => {
          const { email, password } = event as Extract<
            LoginEvent,
            { type: "credentials.submit" }
          >;
          return { email, password };
        },
        onDone: [
          {
            guard: ({ event }) => event.output !== null,
            target: "checkingSecondFactor",
            actions: assign({ userId: ({ event }) => event.output }),
          },
          {
            guard: "lastAttempt",
            target: "lockedOut",
            actions: "countFailure",
          },
          {
            target: "awaitingCredentials",
            actions: ["countFailure", assign({ problem: "badCredentials" })],
          },
        ],
        onError: {
          target: "awaitingCredentials",
          actions: assign({ problem: "unavailable" }),
        },
      },
    },

    checkingSecondFactor: {
      always: [
        { guard: "secondFactorEnabled", target: "awaitingOtp" },
        { target: "authenticated" },
      ],
    },

    awaitingOtp: {
      tags: ["pause"],
      on: {
        "otp.submit": {
          target: "verifyingOtp",
          actions: assign({ problem: null }),
        },
      },
    },

    verifyingOtp: {
      invoke: {
        src: "verifyOtp",
        input: ({ context, event }) => ({
          userId: context.userId!,
          otp: (event as Extract<LoginEvent, { type: "otp.submit" }>).otp,
        }),
        onDone: [
          { guard: ({ event }) => event.output, target: "authenticated" },
          {
            guard: "lastAttempt",
            target: "lockedOut",
            actions: "countFailure",
          },
          {
            target: "awaitingOtp",
            actions: ["countFailure", assign({ problem: "badOtp" })],
          },
        ],
        onError: {
          target: "awaitingOtp",
          actions: assign({ problem: "unavailable" }),
        },
      },
    },

    lockedOut: {
      // Paused for good: ignores every event until the cookie expires.
      tags: ["pause", "failure"],
    },

    authenticated: {
      type: "final",
      tags: ["success"],
    },
  },
  output: ({ context }) => ({ userId: context.userId }),
});
