/**
 * Persist a job (position) for the signed-in user.
 * @module
 */

import { sdk } from "~/api.server";
import type { Positions_Insert_Input } from "src/graphql/_generated";
import {
  parsePay,
  type JobCreationFormValues,
} from "./components/JobCreationForm/validation";

/** Escape LIKE wildcards so `_ilike` acts as a case-insensitive equality. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export type CreatedJob = { id: number; title: string };

/**
 * Insert a position, reusing the user's employer with the same name
 * (case-insensitively) or creating a new one. Values must already be valid.
 */
export async function createJob(
  values: JobCreationFormValues,
  hasuraAccessToken: string
): Promise<CreatedJob> {
  const headers = { authorization: `Bearer ${hasuraAccessToken}` };

  const object: Positions_Insert_Input = {
    title: values.title.trim(),
    posting_url: values.postingUrl.trim() || null,
    pay_range_lower: parsePay(values.payRangeLower),
    pay_range_upper: parsePay(values.payRangeUpper),
  };

  const employerName = values.employerName.trim();
  if (employerName) {
    const { employers } = await sdk.employerByName(
      { name: escapeLike(employerName) },
      headers
    );
    if (employers[0]) {
      object.employer_id = employers[0].id;
    } else {
      // Nested insert: Hasura creates the employer in the same transaction.
      object.employer = { data: { name: employerName } };
    }
  }

  const { insert_positions_one } = await sdk.insertPosition({ object }, headers);
  if (!insert_positions_one) throw new Error("Position insert returned no row.");
  return insert_positions_one;
}
