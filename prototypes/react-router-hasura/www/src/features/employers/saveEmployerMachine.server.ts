/**
 * Save-employer machine wired to Hasura for one signed-in user.
 * @module
 */

import { fromPromise } from "xstate";

import { logFailures } from "~/utils/logFailures.server";
import { findEmployerByName } from "~/features/jobs/createJob.server";
import { saveEmployer } from "./employers.server";
import {
  saveEmployerMachine,
  type SaveEmployerActorInput,
  type SavedEmployer,
} from "./saveEmployerMachine";

export function saveEmployerMachineFor(hasuraAccessToken: string) {
  return saveEmployerMachine.provide({
    actors: {
      findEmployerByName: fromPromise<number | null, { name: string }>(({ input }) =>
        logFailures("Failed to look up employer", () =>
          findEmployerByName(input.name, hasuraAccessToken)
        )
      ),
      saveEmployer: fromPromise<SavedEmployer | null, SaveEmployerActorInput>(
        ({ input }) =>
          logFailures("Failed to save employer", () =>
            saveEmployer(input, hasuraAccessToken)
          )
      ),
    },
  });
}
