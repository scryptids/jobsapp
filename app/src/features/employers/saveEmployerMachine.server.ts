/**
 * Save-employer machine wired to the database for one signed-in user.
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

export function saveEmployerMachineFor(userId: number) {
  return saveEmployerMachine.provide({
    actors: {
      findEmployerByName: fromPromise<number | null, { name: string }>(({ input }) =>
        logFailures("Failed to look up employer", () =>
          findEmployerByName(input.name, userId)
        )
      ),
      saveEmployer: fromPromise<SavedEmployer | null, SaveEmployerActorInput>(
        ({ input }) =>
          logFailures("Failed to save employer", () =>
            saveEmployer(input, userId)
          )
      ),
    },
  });
}
