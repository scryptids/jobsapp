/**
 * Employer create/edit use case as a state machine. Creates when the input
 * has no employer id, otherwise updates that employer.
 *
 * ```
 * validating ──[bad id]──▶ invalid (final)
 *            └──────────▶ awaitingValues
 * awaitingValues ──employer.submit──▶ (invalid values) awaitingValues
 *                                  └▶ checkingName
 * checkingName ──another employer has the name──▶ awaitingValues (nameTaken)
 *              └────────────────────────────────▶ saving
 * saving ──saved──▶ saved (final)
 *        └none───▶ notFound (final)
 * (any store error) ──▶ awaitingValues
 * ```
 *
 * Names are unique per user, case-insensitively, matching how job creation
 * reuses employers by name.
 * @module
 */

import { assign, fromPromise, setup } from "xstate";

import { parseId } from "~/utils/parseId";
import {
  validateEmployerForm,
  type EmployerFieldErrors,
  type EmployerFormValues,
} from "./validation";

export type SavedEmployer = { id: number; name: string };

export type SaveEmployerEvent = { type: "employer.submit" } & EmployerFormValues;

export type SaveEmployerProblem = "invalidInput" | "nameTaken" | "unavailable";

/** `employerId: null` creates a new employer. */
export type SaveEmployerInput = { employerId: string | undefined | null };

export type SaveEmployerContext = {
  creating: boolean;
  employerId: number | null;
  values: EmployerFormValues | null;
  fieldErrors: EmployerFieldErrors | null;
  problem: SaveEmployerProblem | null;
  employer: SavedEmployer | null;
};

export type SaveEmployerActorInput = {
  /** Null to create. */
  employerId: number | null;
  values: EmployerFormValues;
};

export function employerValuesOf(event: SaveEmployerEvent): EmployerFormValues {
  return { name: event.name, notes: event.notes ?? "" };
}

export const saveEmployerMachine = setup({
  types: {
    context: {} as SaveEmployerContext,
    events: {} as SaveEmployerEvent,
    input: {} as SaveEmployerInput,
    output: {} as { employer: SavedEmployer | null },
  },
  actors: {
    /** Resolves to the id of the user's employer with this name, or null. */
    findEmployerByName: fromPromise<number | null, { name: string }>(async () => {
      throw new Error("findEmployerByName actor not provided");
    }),
    /** Resolves to the saved employer, or null if it isn't the user's. */
    saveEmployer: fromPromise<SavedEmployer | null, SaveEmployerActorInput>(
      async () => {
        throw new Error("saveEmployer actor not provided");
      }
    ),
  },
  guards: {
    badId: ({ context }) => !context.creating && context.employerId === null,
    valuesInvalid: ({ event }) =>
      validateEmployerForm(employerValuesOf(event)) !== null,
  },
}).createMachine({
  id: "saveEmployer",
  context: ({ input }) => ({
    creating: input.employerId === null,
    employerId: input.employerId === null ? null : parseId(input.employerId),
    values: null,
    fieldErrors: null,
    problem: null,
    employer: null,
  }),
  initial: "validating",
  states: {
    validating: {
      always: [{ guard: "badId", target: "invalid" }, { target: "awaitingValues" }],
    },

    awaitingValues: {
      tags: ["pause"],
      on: {
        "employer.submit": [
          {
            guard: "valuesInvalid",
            actions: assign(({ event }) => ({
              values: employerValuesOf(event),
              fieldErrors: validateEmployerForm(employerValuesOf(event)),
              problem: "invalidInput" as const,
            })),
          },
          {
            target: "checkingName",
            actions: assign(({ event }) => ({
              values: employerValuesOf(event),
              fieldErrors: null,
              problem: null,
            })),
          },
        ],
      },
    },

    checkingName: {
      invoke: {
        src: "findEmployerByName",
        input: ({ context }) => ({ name: context.values!.name.trim() }),
        onDone: [
          {
            guard: ({ context, event }) =>
              event.output !== null && event.output !== context.employerId,
            target: "awaitingValues",
            actions: assign(({ context }) => ({
              problem: "nameTaken" as const,
              fieldErrors: {
                name: `You already have an employer named ${context.values!.name.trim()}.`,
              },
            })),
          },
          { target: "saving" },
        ],
        onError: {
          target: "awaitingValues",
          actions: assign({ problem: "unavailable" }),
        },
      },
    },

    saving: {
      invoke: {
        src: "saveEmployer",
        input: ({ context }) => ({
          employerId: context.employerId,
          values: context.values!,
        }),
        onDone: [
          {
            guard: ({ event }) => event.output !== null,
            target: "saved",
            actions: assign({ employer: ({ event }) => event.output }),
          },
          { target: "notFound" },
        ],
        onError: {
          target: "awaitingValues",
          actions: assign({ problem: "unavailable" }),
        },
      },
    },

    saved: { type: "final", tags: ["success"] },
    notFound: { type: "final", tags: ["failure"] },
    invalid: { type: "final", tags: ["failure"] },
  },
  output: ({ context }) => ({ employer: context.employer }),
});
