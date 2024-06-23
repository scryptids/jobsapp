/**
 * Definitions for login state machines.
 * 
 * In development, the mock login machine is used.
 * @module
 */

import { Session } from "@remix-run/node";
import { setup, fromPromise, assign } from "xstate";

import { initSession } from "~/sessions";

const _autologinMachine = setup({
  types: {
    context: {} as { session: Session },
    input: {} as { session: Session },
  },
  actors: {
    initSession: fromPromise(async ({ input }) => {
      // @ts-ignore
      return initSession(input.session, 1)
    })
  },
}).createMachine({
  id: 'auto_login_machine',
  context: ({ input }) => ({
    session: input.session,
  }),
  initial: 'start',
  states: {
    start: {
      invoke: {
        id: 'session_init_actor',
        src: 'initSession',
        input: ({ context: { session } }) => ({ session }),
        onDone: {
          target: '/home',
          // @ts-ignore
          actions: assign({ session: ({ event }) => event.output })
        },
      },
    },
    "/home": {
      type: 'final',
      tags: ['success'],
    },
  },
  output: ({ context }) => ({
    session: context.session,
  }),
})

// const _loginMachine = setup({
//   types: {
//     context: {} as { session: Session },
//     input: {} as { session: Session }
//   },
// }).createMachine({
//   id: "login_machine",
//   initial: "login",
//   states: {
//     login: {
//       tags: ["pause"],
//     },
//     submit: {
//     },
//     mfa: {
//       tags: ["pause"],
//     },
//     home: {
//       type: "final",
//     },
//     failure: {
//       type: "final",
//     },
//   },
// })

/**
 * The login state machine.
 */
export const loginMachine = _autologinMachine
// export const loginMachine = (process.env.NODE_ENV === "development")
//   ? _mockLoginMachine
//   : _loginMachine
