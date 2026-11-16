/**
 * Job editing use case as a state machine.
 *
 * ```
 * validating ──[bad id]──▶ invalid (final)
 *            └──────────▶ awaitingValues
 * awaitingValues ──job.submit──▶ (invalid values) awaitingValues
 *                             └▶ checkingEmployer
 * checkingEmployer ──[no employer name]──▶ updatingPosition (employer cleared)
 *                  └────────────────────▶ findingEmployer
 * findingEmployer ──found──▶ updatingPosition
 *                 └none───▶ insertingEmployer ──▶ updatingPosition
 * updatingPosition ──updated──▶ updated (final)
 *                  └none─────▶ notFound (final)
 * (any store error) ──▶ awaitingValues
 * ```
 *
 * Employer names resolve as in job creation: the user's existing employer
 * with the same name (case-insensitively) is reused, otherwise one is created.
 * "Not found" also covers jobs owned by someone else.
 * @module
 */

import { assign, fromPromise, setup } from "xstate";

import { parseId } from "~/utils/parseId";
import {
  validateJobForm,
  type JobCreationFieldErrors,
  type JobCreationFormValues,
} from "./components/JobCreationForm/validation";
import { jobValuesOf, type CreateJobEvent, type CreatedJob } from "./createJobMachine";

export type UpdatedJob = CreatedJob;

export type UpdateJobEvent = CreateJobEvent;

export type UpdateJobProblem = "invalidInput" | "unavailable";

export type UpdateJobInput = { jobId: string | undefined };

export type UpdateJobContext = {
  jobId: number | null;
  values: JobCreationFormValues | null;
  /** Employer to attach, or null for none. */
  employerId: number | null;
  fieldErrors: JobCreationFieldErrors | null;
  problem: UpdateJobProblem | null;
  job: UpdatedJob | null;
};

export type UpdatePositionInput = {
  jobId: number;
  values: JobCreationFormValues;
  employerId: number | null;
};

export const updateJobMachine = setup({
  types: {
    context: {} as UpdateJobContext,
    events: {} as UpdateJobEvent,
    input: {} as UpdateJobInput,
    output: {} as { job: UpdatedJob | null },
  },
  actors: {
    /** Resolves to the id of the user's employer with this name, or null. */
    findEmployerByName: fromPromise<number | null, { name: string }>(async () => {
      throw new Error("findEmployerByName actor not provided");
    }),
    /** Creates an employer for the user and resolves to its id. */
    insertEmployer: fromPromise<number, { name: string }>(async () => {
      throw new Error("insertEmployer actor not provided");
    }),
    /** Resolves to the updated job, or null if it isn't the user's. */
    updatePosition: fromPromise<UpdatedJob | null, UpdatePositionInput>(async () => {
      throw new Error("updatePosition actor not provided");
    }),
  },
  guards: {
    badId: ({ context }) => context.jobId === null,
    valuesInvalid: ({ event }) => validateJobForm(jobValuesOf(event)) !== null,
    noEmployerName: ({ context }) => !context.values?.employerName.trim(),
  },
}).createMachine({
  id: "updateJob",
  context: ({ input }) => ({
    jobId: parseId(input.jobId),
    values: null,
    employerId: null,
    fieldErrors: null,
    problem: null,
    job: null,
  }),
  initial: "validating",
  states: {
    validating: {
      always: [{ guard: "badId", target: "invalid" }, { target: "awaitingValues" }],
    },

    awaitingValues: {
      tags: ["pause"],
      on: {
        "job.submit": [
          {
            guard: "valuesInvalid",
            actions: assign(({ event }) => ({
              values: jobValuesOf(event),
              fieldErrors: validateJobForm(jobValuesOf(event)),
              problem: "invalidInput" as const,
            })),
          },
          {
            target: "checkingEmployer",
            actions: assign(({ event }) => ({
              values: jobValuesOf(event),
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
        { guard: "noEmployerName", target: "updatingPosition" },
        { target: "findingEmployer" },
      ],
    },

    findingEmployer: {
      invoke: {
        src: "findEmployerByName",
        input: ({ context }) => ({ name: context.values!.employerName.trim() }),
        onDone: [
          {
            guard: ({ event }) => event.output !== null,
            target: "updatingPosition",
            actions: assign({ employerId: ({ event }) => event.output }),
          },
          { target: "insertingEmployer" },
        ],
        onError: {
          target: "awaitingValues",
          actions: assign({ problem: "unavailable" }),
        },
      },
    },

    insertingEmployer: {
      invoke: {
        src: "insertEmployer",
        input: ({ context }) => ({ name: context.values!.employerName.trim() }),
        onDone: {
          target: "updatingPosition",
          actions: assign({ employerId: ({ event }) => event.output }),
        },
        onError: {
          target: "awaitingValues",
          actions: assign({ problem: "unavailable" }),
        },
      },
    },

    updatingPosition: {
      invoke: {
        src: "updatePosition",
        input: ({ context }) => ({
          jobId: context.jobId!,
          values: context.values!,
          employerId: context.employerId,
        }),
        onDone: [
          {
            guard: ({ event }) => event.output !== null,
            target: "updated",
            actions: assign({ job: ({ event }) => event.output }),
          },
          { target: "notFound" },
        ],
        onError: {
          target: "awaitingValues",
          actions: assign({ problem: "unavailable" }),
        },
      },
    },

    updated: { type: "final", tags: ["success"] },
    notFound: { type: "final", tags: ["failure"] },
    invalid: { type: "final", tags: ["failure"] },
  },
  output: ({ context }) => ({ job: context.job }),
});
