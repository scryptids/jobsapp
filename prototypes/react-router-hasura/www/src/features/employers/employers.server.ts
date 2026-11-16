/**
 * Hasura persistence for employers, as used by the employer machines. All
 * calls run as the signed-in user, so Hasura's `user` role scopes rows to them.
 * @module
 */

import { ClientError } from "graphql-request";

import { sdk } from "~/api.server";
import { authHeaders } from "~/features/jobs/createJob.server";
import { normalizeNotes } from "~/features/jobs/components/JobCreationForm/validation";
import type { DeleteEmployerResult } from "./deleteEmployerMachine";
import type { SaveEmployerActorInput, SavedEmployer } from "./saveEmployerMachine";

/** Create or update; null when updating an employer that isn't the user's. */
export async function saveEmployer(
  { employerId, values }: SaveEmployerActorInput,
  hasuraAccessToken: string
): Promise<SavedEmployer | null> {
  const fields = { name: values.name.trim(), notes: normalizeNotes(values.notes) };
  if (employerId === null) {
    const { insert_employers_one } = await sdk.insertEmployer(
      { object: fields },
      authHeaders(hasuraAccessToken)
    );
    if (!insert_employers_one) throw new Error("Employer insert returned no row.");
    return insert_employers_one;
  }
  const { update_employers_by_pk } = await sdk.updateEmployer(
    { id: employerId, set: fields },
    authHeaders(hasuraAccessToken)
  );
  return update_employers_by_pk ?? null;
}

/** Number of the employer's jobs, or null if it isn't the user's. */
export async function countEmployerJobs(
  employerId: number,
  hasuraAccessToken: string
): Promise<number | null> {
  const { employers_by_pk } = await sdk.employerJobCount(
    { id: employerId },
    authHeaders(hasuraAccessToken)
  );
  if (!employers_by_pk) return null;
  return employers_by_pk.positions_aggregate.aggregate?.count ?? 0;
}

/** Hasura reports the positions foreign key refusing the delete this way. */
export function isForeignKeyViolation(e: unknown): boolean {
  return (
    e instanceof ClientError &&
    (e.response.errors ?? []).some(
      (err) =>
        (err.extensions as { code?: string } | undefined)?.code ===
          "constraint-violation" && /foreign key/i.test(err.message)
    )
  );
}

export async function deleteEmployer(
  employerId: number,
  hasuraAccessToken: string
): Promise<DeleteEmployerResult> {
  try {
    const { delete_employers_by_pk } = await sdk.deleteEmployer(
      { id: employerId },
      authHeaders(hasuraAccessToken)
    );
    return delete_employers_by_pk ? "deleted" : "notFound";
  } catch (e) {
    if (isForeignKeyViolation(e)) return "hasJobs";
    throw e;
  }
}
