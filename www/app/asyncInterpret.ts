/**
 * Utilities for interpreting XState state machines.
 * 
 * This code has been adapted from Erik Rasmussen's 2022 Remix Conf demo.
 * @see https://www.youtube.com/watch?v=r4xI6LPf6iQ
 * @see https://github.com/erikras/remix-conf-2022
 * 
 * @module
 */

import { Session } from "@remix-run/node";
import {
  EventFromLogic,
  Snapshot,
  SnapshotFrom,
  createActor,
  setup,
  fromCallback,
  fromPromise,
  waitFor,
  assign,
  sendTo,
  type AnyActorLogic,
  type AnyActorRef,
} from "xstate";

function pausedOrDonePredicate(emitted: SnapshotFrom<AnyActorRef>): boolean {
  if (emitted.status === 'done') {
    return true
  }
  if (emitted.hasTag("pause")) {
    return true
  }
  return false
}

const DEFAULT_TIMEOUT = 2_000

export interface AsyncInterpretOptions {
  timeoutMs?: number
  input?: Record<any, any>,
  initialState?: Snapshot<any>,
  initialEvent?: EventFromLogic<AnyActorLogic>,
}

export async function asyncInterpret(logic: AnyActorLogic, options?: AsyncInterpretOptions) {
  const actor = createActor(logic, {
    snapshot: options?.initialState,
    input: options?.input,
  });
  actor.start();
  if (options?.initialEvent) {
    actor.send(options?.initialEvent);
  }
  return await waitFor(
    actor,
    pausedOrDonePredicate,
    { timeout: options?.timeoutMs ?? DEFAULT_TIMEOUT }
  );
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest

  {
    // test to see if asyncInterpret can run a machine with an eventless transition to get to the final state
    const simpleAlwaysMachine = setup({
    }).createMachine({
      id: 'simple_always',
      initial: 'initial_state',
      states: {
        initial_state: {
          always: {
            target: 'final_state',
          },
        },
        final_state: {
          type: 'final',
        },
      },
      output: {
        message: 'elementary_watson'
      }
    })

    it('interprets a machine with an always transition', async () => {
      const state = await asyncInterpret(simpleAlwaysMachine, { timeoutMs: 100 })
      expect(state.status).toBe('done')
      expect(state.value).toBe('final_state')
      expect(state.output.message).toBe('elementary_watson')
      expect(state.error).toBeUndefined()
    })
  }

  {
    // test to see if asyncInterpret times out a halted machine (not in pause or final state)
    const simpleHaltingMachine = setup({
      actors: {
        noOpLogic: fromCallback((_) => {
          return () => {}
        }),
      },
    }).createMachine({
      id: 'simple_halting',
      initial: 'initial_state',
      states: {
        initial_state: {
          invoke: {
            id: 'no_op',
            src: 'noOpLogic',
          },
        },
        final_state: {
          type: 'final',
        },
      },
    })

    it('times-out a halted machine', async () => {
      await expect(asyncInterpret(simpleHaltingMachine, { timeoutMs: 100 })).rejects.toThrow('Timeout of 100 ms exceeded')
    })
  }

  {
    // test a mocked login flow using a callback-based child machine

    type LoginMachineEvent =
      | { type: 'creds.submit', username: string, password: string }
      | { type: 'creds.error', message: string }
      | { type: 'creds.invalid' }
      | { type: 'creds.valid', userId: string }

    const callbackActorLoginMachine = setup({
      types: {
        context: {} as { userId?: string, attempts: number },
        events: {} as LoginMachineEvent,
        input: {} as { attempts?: number },
      },
      actors: {
        loginLogic: fromCallback<LoginMachineEvent>(({ sendBack, receive }) => {
          receive(event => {
            if (event.type === 'creds.submit') {
              if (!event.username || !event.password) {
                sendBack({ type: 'creds.error', message: 'missing username and/or password'})
                return
              }
      
              if (event.username === 'admin' && event.password === 'password') {
                sendBack({ type: 'creds.valid', userId: '1' })
              } else {
                sendBack({ type: 'creds.invalid' })
              }
            }
          })
      
          // cleanup function
          return () => {
          }
        }),
      },
    }).createMachine({
      id: 'simple_login',
      context: ({ input }) => ({
        userId: undefined,
        attempts: input?.attempts ?? 0
      }),
      initial: 'login',
      states: {
        login: {
          tags: ['pause'],
          always: {
            guard: ({ context }) => context.attempts > 3,
            target: 'failure',
          },
          invoke: {
            id: 'loginChild',
            src: 'loginLogic',
          },
          on: {
            "creds.submit": {
              actions: [
                sendTo('loginChild', ({ event }) => event),
                assign({ attempts: ({context}) => context.attempts + 1 })
              ],
            },
            "creds.valid" : {
              target: 'success',
              actions: assign({
                userId: ({ event }) => event.userId
              })
            },
          },
          onError: {
            target: 'failure',
          },
        },
        success: {
          type: 'final',
        },
        failure: {
          type: 'final',
        },
      },
      output: ({ context }) => ({
        userId: context.userId,
      })
    })

    it('callback-based login machine processes an action', async () => {
      const state = await asyncInterpret(callbackActorLoginMachine, {
        timeoutMs: 100,
        initialEvent: {
          type: 'creds.submit',
          username: 'admin',
          password: 'password',
        },
      })
      expect(state.status).toBe('done')
      expect(state.value).toBe('success')
      expect(state.output.userId).toBe('1')
      expect(state.error).toBeUndefined()
    })

    it('callback-based login machine limits max attempts', async () => {
      let state = await asyncInterpret(callbackActorLoginMachine, {
        timeoutMs: 100,
        initialEvent: {
          type: 'creds.submit',
          username: 'admin',
          password: 'admin',
        },
      })
      expect(state.value).toBe('login')
      expect(state.context).toStrictEqual({ userId: undefined, attempts: 1 })
      state = await asyncInterpret(callbackActorLoginMachine, {
        timeoutMs: 100,
        initialState: state,
        initialEvent: {
          type: 'creds.submit',
          username: 'admin',
          password: '123456',
        },
      })
      expect(state.value).toBe('login')
      expect(state.context).toStrictEqual({ userId: undefined, attempts: 2 })
      state = await asyncInterpret(callbackActorLoginMachine, {
        timeoutMs: 100,
        initialState: state,
        initialEvent: {
          type: 'creds.submit',
          username: 'admin',
          password: 'baseball',
        },
      })
      expect(state.value).toBe('login')
      expect(state.context).toStrictEqual({ userId: undefined, attempts: 3 })
      state = await asyncInterpret(callbackActorLoginMachine, {
        timeoutMs: 100,
        initialState: state,
        initialEvent: {
          type: 'creds.submit',
          username: 'admin',
          password: 'football',
        },
      })
      expect(state.value).toBe('failure')
      expect(state.context).toStrictEqual({ userId: undefined, attempts: 4 })
    })

    it('callback-based login machine initializes context using input', async () => {
      const state = await asyncInterpret(callbackActorLoginMachine, {
        timeoutMs: 100,
        initialEvent: {
          type: 'creds.submit',
          username: 'admin',
          password: 'password',
        },
        input: { attempts: 3, },
      });
      expect(state.status).toBe('done')
      expect(state.value).toBe('failure')
    })
  }

  {
    // test having a child actor mutate an external object

    type MockSession = {
      userId: number,
    }

    const autologinMachine = setup({
      types: {
        context: {} as { session: MockSession },
        input: {} as { session: MockSession },
      },
      actors: {
        initSession: fromPromise(async ({ input }) => {
          // @ts-ignore
          input.session.userId = 1
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
            },
          },
        },
        "/home": {
          type: 'final',
        },
      },
    })

    it('state machine with promise child actor mutates external object', async () => {
      const session: Partial<MockSession> = {
        userId: undefined,
      }
      const state = await asyncInterpret(autologinMachine, {
        timeoutMs: 100,
        input: { session: session },
      })
      expect(session.userId).toBe(1)
      expect(state.status).toBe('done')
    })
  }
}
