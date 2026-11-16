/**
 * Update-job machine wired to Hasura for one signed-in user.
 * @module
 */

import { fromPromise } from "xstate";

import { sdk } from "~/api.server";
import { logFailures } from "~/utils/logFailures.server";
import {
  authHeaders,
  findEmployerByName,
  insertEmployer,
  positionFieldsFrom,
} from "./createJob.server";
import {
  updateJobMachine,
  type UpdatedJob,
  type UpdatePositionInput,
} from "./updateJobMachine";

export function updateJobMachineFor(hasuraAccessToken: string) {
  return updateJobMachine.provide({
    actors: {
      findEmployerByName: fromPromise<number | null, { name: string }>(({ input }) =>
        logFailures("Failed to look up employer", () =>
          findEmployerByName(input.name, hasuraAccessToken)
        )
      ),
      insertEmployer: fromPromise<number, { name: string }>(({ input }) =>
        logFailures("Failed to create employer", () =>
          insertEmployer(input.name, hasuraAccessToken)
        )
      ),
      updatePosition: fromPromise<UpdatedJob | null, UpdatePositionInput>(
        ({ input }) =>
          logFailures("Failed to update job", async () => {
            // Hasura's update permission filters by user, so another user's
            // job comes back as null, just like a missing one.
            const { update_positions_by_pk } = await sdk.updatePosition(
              {
                id: input.jobId,
                set: { ...positionFieldsFrom(input.values), employer_id: input.employerId },
              },
              authHeaders(hasuraAccessToken)
            );
            return update_positions_by_pk ?? null;
          })
      ),
    },
  });
}
