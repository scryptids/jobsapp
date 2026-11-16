/**
 * Create-job machine wired to Hasura for one signed-in user.
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
 * The machine with actors bound to the user's Hasura token. The token stays
 * in these closures instead of machine context.
 */
export function createJobMachineFor(hasuraAccessToken: string) {
  return createJobMachine.provide({
    actors: {
      findEmployerByName: fromPromise<number | null, { name: string }>(
        ({ input }) =>
          logFailures("Failed to look up employer", () =>
            findEmployerByName(input.name, hasuraAccessToken)
          )
      ),
      insertPosition: fromPromise<CreatedJob, InsertPositionInput>(({ input }) =>
        logFailures("Failed to create job", () =>
          insertPosition(input, hasuraAccessToken)
        )
      ),
    },
  });
}
