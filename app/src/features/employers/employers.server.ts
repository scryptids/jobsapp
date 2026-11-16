/**
 * Persistence for employers, as used by the employer machines. Every call is
 * scoped to the signed-in user's id.
 * @module
 */

import { ForeignKeyError } from "~/db/errors";
import { employersRepo } from "~/db/repository.server";
import { normalizeNotes } from "~/features/jobs/components/JobCreationForm/validation";
import type { DeleteEmployerResult } from "./deleteEmployerMachine";
import type { SaveEmployerActorInput, SavedEmployer } from "./saveEmployerMachine";

/** Create or update; null when updating an employer that isn't the user's. */
export function saveEmployer(
  { employerId, values }: SaveEmployerActorInput,
  userId: number
): Promise<SavedEmployer | null> {
  const fields = { name: values.name.trim(), notes: normalizeNotes(values.notes) };
  return employerId === null
    ? employersRepo.insert(userId, fields)
    : employersRepo.update(userId, employerId, fields);
}

/** Number of the employer's jobs, or null if it isn't the user's. */
export function countEmployerJobs(
  employerId: number,
  userId: number
): Promise<number | null> {
  return employersRepo.jobCount(userId, employerId);
}

export async function deleteEmployer(
  employerId: number,
  userId: number
): Promise<DeleteEmployerResult> {
  try {
    return (await employersRepo.delete(userId, employerId)) ? "deleted" : "notFound";
  } catch (e) {
    if (e instanceof ForeignKeyError) return "hasJobs";
    throw e;
  }
}
