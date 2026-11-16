/**
 * Delete-employer machine wired to Hasura for one signed-in user.
 * @module
 */

import { fromPromise } from "xstate";

import { logFailures } from "~/utils/logFailures.server";
import { countEmployerJobs, deleteEmployer } from "./employers.server";
import {
  deleteEmployerMachine,
  type DeleteEmployerResult,
} from "./deleteEmployerMachine";

export function deleteEmployerMachineFor(hasuraAccessToken: string) {
  return deleteEmployerMachine.provide({
    actors: {
      countJobs: fromPromise<number | null, { employerId: number }>(({ input }) =>
        logFailures("Failed to count employer jobs", () =>
          countEmployerJobs(input.employerId, hasuraAccessToken)
        )
      ),
      deleteEmployer: fromPromise<DeleteEmployerResult, { employerId: number }>(
        ({ input }) =>
          logFailures("Failed to delete employer", () =>
            deleteEmployer(input.employerId, hasuraAccessToken)
          )
      ),
    },
  });
}
