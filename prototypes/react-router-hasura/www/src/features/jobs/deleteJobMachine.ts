/**
 * Job deletion use case as a state machine. Runs to a final state within one
 * request.
 *
 * ```
 * validating ──[bad id]──▶ invalid
 *            └──────────▶ deleting ──deleted──▶ deleted
 *                                  ──none───▶ notFound
 *                                  ──error──▶ failed
 * ```
 *
 * "Not found" also covers jobs owned by someone else, so callers can't tell
 * which ids exist.
 * @module
 */

import { fromPromise, setup } from "xstate";

import { parseId } from "~/utils/parseId";

export type DeleteJobInput = { jobId: string | undefined };

export const deleteJobMachine = setup({
  types: {
    context: {} as { jobId: number | null },
    input: {} as DeleteJobInput,
  },
  actors: {
    /** Resolves to whether a job was deleted. */
    deletePosition: fromPromise<boolean, { jobId: number }>(async () => {
      throw new Error("deletePosition actor not provided");
    }),
  },
}).createMachine({
  id: "deleteJob",
  context: ({ input }) => ({ jobId: parseId(input.jobId) }),
  initial: "validating",
  states: {
    validating: {
      always: [
        { guard: ({ context }) => context.jobId === null, target: "invalid" },
        { target: "deleting" },
      ],
    },
    deleting: {
      invoke: {
        src: "deletePosition",
        input: ({ context }) => ({ jobId: context.jobId! }),
        onDone: [
          { guard: ({ event }) => event.output, target: "deleted" },
          { target: "notFound" },
        ],
        onError: { target: "failed" },
      },
    },
    deleted: { type: "final", tags: ["success"] },
    notFound: { type: "final", tags: ["failure"] },
    invalid: { type: "final", tags: ["failure"] },
    failed: { type: "final", tags: ["failure"] },
  },
});
