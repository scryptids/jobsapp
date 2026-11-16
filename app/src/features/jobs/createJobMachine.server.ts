/**
 * Create-job machine wired to the database for one signed-in user.
 * @module
 */

import { fromPromise } from "xstate";

import { logFailures } from "~/utils/logFailures.server";
import { findEmployerByName, insertPosition } from "./createJob.server";
import {
  createJobMachine,
  type CreatedJob,
  type InsertPositionInput,
} from "./createJobMachine";

/**
 * The machine with actors bound to the user id, which stays in these
 * closures instead of machine context.
 */
export function createJobMachineFor(userId: number) {
  return createJobMachine.provide({
    actors: {
      findEmployerByName: fromPromise<number | null, { name: string }>(
        ({ input }) =>
          logFailures("Failed to look up employer", () =>
            findEmployerByName(input.name, userId)
          )
      ),
      insertPosition: fromPromise<CreatedJob, InsertPositionInput>(({ input }) =>
        logFailures("Failed to create job", () =>
          insertPosition(input, userId)
        )
      ),
    },
  });
}
