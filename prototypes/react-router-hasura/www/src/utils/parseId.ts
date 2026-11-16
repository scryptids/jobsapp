/**
 * Route param parsing for numeric ids.
 * @module
 */

/** Positive integer id from a route param, or null. */
export function parseId(raw: string | undefined): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  describe("parseId", () => {
    it("accepts positive integers only", () => {
      expect(parseId("12")).toBe(12);
      for (const bad of [undefined, "", "abc", "0", "-3", "1.5"]) {
        expect(parseId(bad)).toBeNull();
      }
    });
  });
}
