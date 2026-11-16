/**
 * Persistence for job (position) creation, as used by the create-job
 * machine. All calls run as the signed-in user, so Hasura's `user` role
 * scopes employers and positions to them.
 * @module
 */

import { sdk } from "~/api.server";
import type { Positions_Insert_Input, Positions_Set_Input } from "src/graphql/_generated";
import {
  normalizeNotes,
  parsePay,
  type JobCreationFormValues,
} from "./components/JobCreationForm/validation";
import type { CreatedJob, InsertPositionInput } from "./createJobMachine";

/** Escape LIKE wildcards so `_ilike` acts as a case-insensitive equality. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function authHeaders(hasuraAccessToken: string) {
  return { authorization: `Bearer ${hasuraAccessToken}` };
}

/** Id of the user's employer with this name (case-insensitive), or null. */
export async function findEmployerByName(
  name: string,
  hasuraAccessToken: string
): Promise<number | null> {
  const { employers } = await sdk.employerByName(
    { name: escapeLike(name) },
    authHeaders(hasuraAccessToken)
  );
  return employers[0]?.id ?? null;
}

/** Position columns from valid form values (employer handled separately). */
export function positionFieldsFrom(values: JobCreationFormValues): Positions_Set_Input {
  return {
    title: values.title.trim(),
    posting_url: values.postingUrl.trim() || null,
    pay_range_lower: parsePay(values.payRangeLower),
    pay_range_upper: parsePay(values.payRangeUpper),
    notes: normalizeNotes(values.notes),
  };
}

/** Create an employer for the user and return its id. */
export async function insertEmployer(
  name: string,
  hasuraAccessToken: string
): Promise<number> {
  const { insert_employers_one } = await sdk.insertEmployer(
    { object: { name } },
    authHeaders(hasuraAccessToken)
  );
  if (!insert_employers_one) throw new Error("Employer insert returned no row.");
  return insert_employers_one.id;
}

/**
 * Insert a position. Attaches `employerId` when given; otherwise creates the
 * named employer in the same transaction (Hasura nested insert), if any.
 * Values must already be valid.
 */
export async function insertPosition(
  { values, employerId }: InsertPositionInput,
  hasuraAccessToken: string
): Promise<CreatedJob> {
  const object: Positions_Insert_Input = positionFieldsFrom(values);

  const employerName = values.employerName.trim();
  if (employerId !== null) {
    object.employer_id = employerId;
  } else if (employerName) {
    object.employer = { data: { name: employerName } };
  }

  const { insert_positions_one } = await sdk.insertPosition(
    { object },
    authHeaders(hasuraAccessToken)
  );
  if (!insert_positions_one) throw new Error("Position insert returned no row.");
  return insert_positions_one;
}
