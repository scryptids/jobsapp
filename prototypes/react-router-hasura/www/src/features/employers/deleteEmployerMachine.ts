/**
 * Employer deletion use case as a state machine. Runs to a final state within
 * one request. Employers that still have jobs can't be deleted.
 *
 * ```
 * validating ──[bad id]──▶ invalid
 *            └──────────▶ countingJobs ──none found──▶ notFound
 *                                      ──jobs > 0──▶ hasJobs
 *                                      └──────────▶ deleting ──▶ deleted | notFound | hasJobs
 * (any store error) ──▶ failed
 * ```
 *
 * `deleting` can still report `hasJobs` if a job was added in between (the
 * database's foreign key refuses the delete).
 * @module
 */

import { fromPromise, setup } from "xstate";

import { parseId } from "~/utils/parseId";

export type DeleteEmployerInput = { employerId: string | undefined };

export type DeleteEmployerResult = "deleted" | "notFound" | "hasJobs";

export const deleteEmployerMachine = setup({
  types: {
    context: {} as { employerId: number | null },
    input: {} as DeleteEmployerInput,
  },
  actors: {
    /** Resolves to the employer's job count, or null if it isn't the user's. */
    countJobs: fromPromise<number | null, { employerId: number }>(async () => {
      throw new Error("countJobs actor not provided");
    }),
    deleteEmployer: fromPromise<DeleteEmployerResult, { employerId: number }>(
      async () => {
        throw new Error("deleteEmployer actor not provided");
      }
    ),
  },
}).createMachine({
  id: "deleteEmployer",
  context: ({ input }) => ({ employerId: parseId(input.employerId) }),
  initial: "validating",
  states: {
    validating: {
      always: [
        { guard: ({ context }) => context.employerId === null, target: "invalid" },
        { target: "countingJobs" },
      ],
    },
    countingJobs: {
      invoke: {
        src: "countJobs",
        input: ({ context }) => ({ employerId: context.employerId! }),
        onDone: [
          { guard: ({ event }) => event.output === null, target: "notFound" },
          { guard: ({ event }) => event.output! > 0, target: "hasJobs" },
          { target: "deleting" },
        ],
        onError: { target: "failed" },
      },
    },
    deleting: {
      invoke: {
        src: "deleteEmployer",
        input: ({ context }) => ({ employerId: context.employerId! }),
        onDone: [
          { guard: ({ event }) => event.output === "deleted", target: "deleted" },
          { guard: ({ event }) => event.output === "hasJobs", target: "hasJobs" },
          { target: "notFound" },
        ],
        onError: { target: "failed" },
      },
    },
    deleted: { type: "final", tags: ["success"] },
    hasJobs: { type: "final", tags: ["failure"] },
    notFound: { type: "final", tags: ["failure"] },
    invalid: { type: "final", tags: ["failure"] },
    failed: { type: "final", tags: ["failure"] },
  },
});
