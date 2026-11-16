/**
 * Delete-job machine wired to the database for one signed-in user.
 * @module
 */

import { fromPromise } from "xstate";

import { positionsRepo } from "~/db/repository.server";
import { logFailures } from "~/utils/logFailures.server";
import { deleteJobMachine } from "./deleteJobMachine";

export function deleteJobMachineFor(userId: number) {
  return deleteJobMachine.provide({
    actors: {
      deletePosition: fromPromise<boolean, { jobId: number }>(({ input }) =>
        // Another user's job is reported as missing, just like a deleted one.
        logFailures("Failed to delete job", () => positionsRepo.delete(userId, input.jobId))
      ),
    },
  });
}
