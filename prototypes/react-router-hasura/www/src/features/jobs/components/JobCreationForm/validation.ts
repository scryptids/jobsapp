/**
 * Validation for the job creation form, shared by the browser (instant
 * feedback) and the server action (authoritative).
 * @module
 */

export type JobCreationFormValues = {
  title: string;
  employerName: string;
  postingUrl: string;
  payRangeLower: string;
  payRangeUpper: string;
};

export type JobCreationFieldErrors = Partial<
  Record<keyof JobCreationFormValues, string>
>;

// Limits mirror the database columns.
export const titleMaxLength = 100;
export const employerNameMaxLength = 100;
export const postingUrlMaxLength = 255;
const payMax = 99_999_999.99; // NUMERIC(10, 2)

/**
 * Parse a pay amount such as "85000", "85,000" or "$85,000.50".
 * Returns null for blank input and NaN for anything unparseable.
 */
export function parsePay(raw: string): number | null {
  const cleaned = raw.trim().replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return Number.NaN;
  return Number(cleaned);
}

function validatePay(raw: string): string | undefined {
  const pay = parsePay(raw);
  if (pay === null) return undefined;
  if (Number.isNaN(pay)) return "Enter an amount like 85000 or 85,000.50.";
  if (pay > payMax) return "That amount is too large.";
  return undefined;
}

function validateUrl(raw: string): string | undefined {
  const value = raw.trim();
  if (value === "") return undefined;
  if (value.length > postingUrlMaxLength) {
    return `Must be at most ${postingUrlMaxLength} characters.`;
  }
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return undefined;
  } catch {
    // fall through
  }
  return "Enter a full web address starting with http:// or https://.";
}

/** Returns field errors, or null when the values are valid. */
export function validateJobForm(
  values: JobCreationFormValues
): JobCreationFieldErrors | null {
  const errors: JobCreationFieldErrors = {};

  const title = values.title.trim();
  if (title === "") errors.title = "A title is required.";
  else if (title.length > titleMaxLength) {
    errors.title = `Must be at most ${titleMaxLength} characters.`;
  }

  if (values.employerName.trim().length > employerNameMaxLength) {
    errors.employerName = `Must be at most ${employerNameMaxLength} characters.`;
  }

  const urlError = validateUrl(values.postingUrl);
  if (urlError) errors.postingUrl = urlError;

  const lowerError = validatePay(values.payRangeLower);
  if (lowerError) errors.payRangeLower = lowerError;
  const upperError = validatePay(values.payRangeUpper);
  if (upperError) errors.payRangeUpper = upperError;

  if (!lowerError && !upperError) {
    const lower = parsePay(values.payRangeLower);
    const upper = parsePay(values.payRangeUpper);
    if (lower !== null && upper !== null && lower > upper) {
      errors.payRangeUpper = "Must be at least the minimum pay.";
    }
  }

  return Object.keys(errors).length ? errors : null;
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  const valid: JobCreationFormValues = {
    title: "Engineer",
    employerName: "",
    postingUrl: "",
    payRangeLower: "",
    payRangeUpper: "",
  };

  describe("parsePay", () => {
    it("accepts common formats", () => {
      expect(parsePay("85000")).toBe(85000);
      expect(parsePay(" $85,000.50 ")).toBe(85000.5);
      expect(parsePay("")).toBeNull();
    });
    it("rejects junk and too many decimals", () => {
      expect(parsePay("85k")).toBeNaN();
      expect(parsePay("1.234")).toBeNaN();
      expect(parsePay("-5")).toBeNaN();
    });
  });

  describe("validateJobForm", () => {
    it("accepts a title-only job", () => {
      expect(validateJobForm(valid)).toBeNull();
    });
    it("requires a non-blank title", () => {
      expect(validateJobForm({ ...valid, title: "   " })).toEqual({
        title: "A title is required.",
      });
    });
    it("enforces column lengths", () => {
      expect(
        validateJobForm({
          ...valid,
          title: "x".repeat(101),
          employerName: "y".repeat(101),
        })
      ).toEqual({
        title: "Must be at most 100 characters.",
        employerName: "Must be at most 100 characters.",
      });
    });
    it("only allows http(s) URLs", () => {
      expect(validateJobForm({ ...valid, postingUrl: "https://a.co/j/1" })).toBeNull();
      expect(validateJobForm({ ...valid, postingUrl: "javascript:alert(1)" })?.postingUrl).toBeTruthy();
      expect(validateJobForm({ ...valid, postingUrl: "example.com" })?.postingUrl).toBeTruthy();
    });
    it("checks the pay range order", () => {
      expect(
        validateJobForm({ ...valid, payRangeLower: "90,000", payRangeUpper: "80000" })
      ).toEqual({ payRangeUpper: "Must be at least the minimum pay." });
      expect(
        validateJobForm({ ...valid, payRangeLower: "80000", payRangeUpper: "90000" })
      ).toBeNull();
    });
  });
}
