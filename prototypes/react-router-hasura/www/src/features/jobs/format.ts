/**
 * Display and form formatting for job values.
 * @module
 */

const money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** Hasura returns NUMERIC as a number or string; null stays null. */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** "90,000 – 120,000", "from 90,000", "up to 120,000", or null. */
export function formatPayRange(lower: unknown, upper: unknown): string | null {
  const lo = toNumber(lower);
  const hi = toNumber(upper);
  if (lo !== null && hi !== null) {
    return lo === hi ? money.format(lo) : `${money.format(lo)} – ${money.format(hi)}`;
  }
  if (lo !== null) return `from ${money.format(lo)}`;
  if (hi !== null) return `up to ${money.format(hi)}`;
  return null;
}

/** Pay as the form shows it: plain digits, blank for none. */
export function payFormValue(value: unknown): string {
  const n = toNumber(value);
  return n === null ? "" : String(n);
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  describe("formatPayRange", () => {
    it("formats ranges and open ends", () => {
      expect(formatPayRange(90000, "120000.50")).toBe("90,000 – 120,000.5");
      expect(formatPayRange(90000, null)).toBe("from 90,000");
      expect(formatPayRange(null, 5)).toBe("up to 5");
      expect(formatPayRange(7, 7)).toBe("7");
      expect(formatPayRange(null, undefined)).toBeNull();
    });
  });
  describe("payFormValue", () => {
    it("round-trips to the form", () => {
      expect(payFormValue("90000.00")).toBe("90000");
      expect(payFormValue(null)).toBe("");
    });
  });
}
