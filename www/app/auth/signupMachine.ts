/**
 * Definitions for signup state machines.
 * 
 * In development, the mock signup machine is used.
 *
 * @module
 */

import { assign, fromCallback, setup } from "xstate";

type Context = {
}

type Event =
  | { type: "GoTo" }

const _mockSignupMachine = setup({
  types: {
    context: {} as Context,
    events: {} as Event,
  },
}).createMachine({
  id: "Mock Signup Machine",
  initial: "signup",
  states: {
    submit: {
    },
    mfa: {
    },
    done: {
    },
  },
})

const _signupMachine = setup({
  types: {
    context: {} as Context,
    events: {} as Event,
  },
}).createMachine({
  id: "Signup Machine",
  initial: "signup",
  states: {
    submit: {
    },
    mfa: {
    },
    done: {
    },
  },
})

/**
 * The signup state machine.
 */
export const signupMachine = (process.env.NODE_ENV === "development")
  ? _mockSignupMachine
  : _signupMachine

// const _mockSignupActor = createActor(_mockSignupMachine)
// const _signupActor = createActor(_signupMachine)

// export const signupActor = (process.env.NODE_ENV === "development")
//   ? _mockSignupActor
//   : _signupActor
