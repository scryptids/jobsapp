/**
 * Validation for the employer form, shared by the browser (instant feedback)
 * and the server action (authoritative).
 * @module
 */

import {
  employerNameMaxLength,
  validateNotes,
} from "~/features/jobs/components/JobCreationForm/validation";

export type EmployerFormValues = {
  name: string;
  notes: string;
};

export type EmployerFieldErrors = Partial<Record<keyof EmployerFormValues, string>>;

export const defaultEmployerFormValues: EmployerFormValues = { name: "", notes: "" };

/** Returns field errors, or null when the values are valid. */
export function validateEmployerForm(
  values: EmployerFormValues
): EmployerFieldErrors | null {
  const errors: EmployerFieldErrors = {};

  const name = values.name.trim();
  if (name === "") errors.name = "A name is required.";
  else if (name.length > employerNameMaxLength) {
    errors.name = `Must be at most ${employerNameMaxLength} characters.`;
  }

  const notesError = validateNotes(values.notes);
  if (notesError) errors.notes = notesError;

  return Object.keys(errors).length ? errors : null;
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("validateEmployerForm", () => {
    it("accepts a named employer", () => {
      expect(validateEmployerForm({ name: "Acme", notes: "" })).toBeNull();
    });
    it("requires a name and limits lengths", () => {
      expect(validateEmployerForm({ name: " ", notes: "" })).toEqual({
        name: "A name is required.",
      });
      expect(
        validateEmployerForm({ name: "x".repeat(101), notes: "n".repeat(5001) })
      ).toEqual({
        name: "Must be at most 100 characters.",
        notes: "Must be at most 5,000 characters.",
      });
    });
  });
}
