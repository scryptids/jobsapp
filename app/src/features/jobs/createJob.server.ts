/**
 * Persistence for job (position) creation and editing, as used by the job
 * machines. Every call is scoped to the signed-in user's id.
 * @module
 */

import { employersRepo, positionsRepo, type PositionFields } from "~/db/repository.server";
import {
  normalizeNotes,
  parsePay,
  type JobCreationFormValues,
} from "./components/JobCreationForm/validation";
import type { CreatedJob, InsertPositionInput } from "./createJobMachine";

/** Id of the user's employer with this name (case-insensitive), or null. */
export function findEmployerByName(name: string, userId: number): Promise<number | null> {
  return employersRepo.findIdByName(userId, name);
}

/** Position columns from valid form values (employer handled separately). */
export function positionFieldsFrom(values: JobCreationFormValues): PositionFields {
  return {
    title: values.title.trim(),
    postingUrl: values.postingUrl.trim() || null,
    payRangeLower: parsePay(values.payRangeLower),
    payRangeUpper: parsePay(values.payRangeUpper),
    notes: normalizeNotes(values.notes),
  };
}

/** Create an employer for the user and return its id. */
export async function insertEmployer(name: string, userId: number): Promise<number> {
  const { id } = await employersRepo.insert(userId, { name, notes: null });
  return id;
}

/**
 * Insert a position. Attaches `employerId` when given; otherwise creates the
 * named employer in the same transaction, if any. Values must already be
 * valid.
 */
export function insertPosition(
  { values, employerId }: InsertPositionInput,
  userId: number
): Promise<CreatedJob> {
  return positionsRepo.insert(userId, positionFieldsFrom(values), {
    employerId,
    newEmployerName: values.employerName.trim() || null,
  });
}
