/**
 * Update-job machine wired to the database for one signed-in user.
 * @module
 */

import { fromPromise } from "xstate";

import { positionsRepo } from "~/db/repository.server";
import { logFailures } from "~/utils/logFailures.server";
import { findEmployerByName, insertEmployer, positionFieldsFrom } from "./createJob.server";
import {
  updateJobMachine,
  type UpdatedJob,
  type UpdatePositionInput,
} from "./updateJobMachine";

export function updateJobMachineFor(userId: number) {
  return updateJobMachine.provide({
    actors: {
      findEmployerByName: fromPromise<number | null, { name: string }>(({ input }) =>
        logFailures("Failed to look up employer", () =>
          findEmployerByName(input.name, userId)
        )
      ),
      insertEmployer: fromPromise<number, { name: string }>(({ input }) =>
        logFailures("Failed to create employer", () => insertEmployer(input.name, userId))
      ),
      updatePosition: fromPromise<UpdatedJob | null, UpdatePositionInput>(({ input }) =>
        // Another user's job comes back as null, just like a missing one.
        logFailures("Failed to update job", () =>
          positionsRepo.update(userId, input.jobId, {
            ...positionFieldsFrom(input.values),
            employerId: input.employerId,
          })
        )
      ),
    },
  });
}
