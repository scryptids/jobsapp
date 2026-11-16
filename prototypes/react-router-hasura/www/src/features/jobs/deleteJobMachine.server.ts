/**
 * Delete-job machine wired to Hasura for one signed-in user.
 * @module
 */

import { fromPromise } from "xstate";

import { sdk } from "~/api.server";
import { logFailures } from "~/utils/logFailures.server";
import { deleteJobMachine } from "./deleteJobMachine";

export function deleteJobMachineFor(hasuraAccessToken: string) {
  return deleteJobMachine.provide({
    actors: {
      deletePosition: fromPromise<boolean, { jobId: number }>(({ input }) =>
        logFailures("Failed to delete job", async () => {
          // Hasura's delete permission filters by user, so another user's job
          // comes back as null, just like a missing one.
          const { delete_positions_by_pk } = await sdk.deletePosition(
            { id: input.jobId },
            { authorization: `Bearer ${hasuraAccessToken}` }
          );
          return delete_positions_by_pk !== null;
        })
      ),
    },
  });
}
