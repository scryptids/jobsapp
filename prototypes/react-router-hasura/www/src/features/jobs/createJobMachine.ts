/**
 * Job creation use case as a state machine.
 *
 * ```
 * awaitingValues ──job.submit──▶ (invalid) awaitingValues
 *                             └▶ checkingEmployer
 * checkingEmployer ──[no employer name]──▶ insertingPosition
 *                  └────────────────────▶ findingEmployer
 * findingEmployer ──found / not found──▶ insertingPosition
 * insertingPosition ──▶ created (final)
 * (any store error) ──▶ awaitingValues
 * ```
 *
 * An existing employer with the same name (case-insensitively) is reused;
 * otherwise the position is inserted together with a new employer.
 *
 * Pure definition: side effects are named actors whose defaults throw.
 * `createJobMachine.server.ts` provides request-scoped real ones.
 * @module
 */

import { assign, fromPromise, setup } from "xstate";

import {
  validateJobForm,
  type JobCreationFieldErrors,
  type JobCreationFormValues,
} from "./components/JobCreationForm/validation";

export type CreatedJob = { id: number; title: string };

export type CreateJobEvent = { type: "job.submit" } & JobCreationFormValues;

export type CreateJobProblem = "invalidInput" | "unavailable";

export type CreateJobContext = {
  values: JobCreationFormValues | null;
  /** Id of the existing employer to attach, or null to create one (if named). */
  employerId: number | null;
  fieldErrors: JobCreationFieldErrors | null;
  problem: CreateJobProblem | null;
  job: CreatedJob | null;
};

export type InsertPositionInput = {
  values: JobCreationFormValues;
  employerId: number | null;
};

function valuesOf(event: CreateJobEvent): JobCreationFormValues {
  const { title, employerName, postingUrl, payRangeLower, payRangeUpper } = event;
  return { title, employerName, postingUrl, payRangeLower, payRangeUpper };
}

export const createJobMachine = setup({
  types: {
    context: {} as CreateJobContext,
    events: {} as CreateJobEvent,
    output: {} as { job: CreatedJob | null },
  },
  actors: {
    /** Resolves to the id of the user's employer with this name, or null. */
    findEmployerByName: fromPromise<number | null, { name: string }>(async () => {
      throw new Error("findEmployerByName actor not provided");
    }),
    insertPosition: fromPromise<CreatedJob, InsertPositionInput>(async () => {
      throw new Error("insertPosition actor not provided");
    }),
  },
  guards: {
    valuesInvalid: ({ event }) => validateJobForm(valuesOf(event)) !== null,
    noEmployerName: ({ context }) => !context.values?.employerName.trim(),
  },
}).createMachine({
  id: "createJob",
  context: {
    values: null,
    employerId: null,
    fieldErrors: null,
    problem: null,
    job: null,
  },
  initial: "awaitingValues",
  states: {
    awaitingValues: {
      tags: ["pause"],
      on: {
        "job.submit": [
          {
            guard: "valuesInvalid",
            actions: assign(({ event }) => ({
              values: valuesOf(event),
              fieldErrors: validateJobForm(valuesOf(event)),
              problem: "invalidInput" as const,
            })),
          },
          {
            target: "checkingEmployer",
            actions: assign(({ event }) => ({
              values: valuesOf(event),
              employerId: null,
              fieldErrors: null,
              problem: null,
            })),
          },
        ],
      },
    },

    checkingEmployer: {
      always: [
        { guard: "noEmployerName", target: "insertingPosition" },
        { target: "findingEmployer" },
      ],
    },

    findingEmployer: {
      invoke: {
        src: "findEmployerByName",
        input: ({ context }) => ({ name: context.values!.employerName.trim() }),
        onDone: {
          target: "insertingPosition",
          actions: assign({ employerId: ({ event }) => event.output }),
        },
        onError: {
          target: "awaitingValues",
          actions: assign({ problem: "unavailable" }),
        },
      },
    },

    insertingPosition: {
      invoke: {
        src: "insertPosition",
        input: ({ context }) => ({
          values: context.values!,
          employerId: context.employerId,
        }),
        onDone: {
          target: "created",
          actions: assign({ job: ({ event }) => event.output }),
        },
        onError: {
          target: "awaitingValues",
          actions: assign({ problem: "unavailable" }),
        },
      },
    },

    created: {
      type: "final",
      tags: ["success"],
    },
  },
  output: ({ context }) => ({ job: context.job }),
});
