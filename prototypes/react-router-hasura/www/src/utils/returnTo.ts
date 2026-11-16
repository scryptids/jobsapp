/**
 * Helpers for "return to where I came from" links.
 * @module
 */

export const returnToParam = "returnTo";

/**
 * Accept only same-site absolute paths, so a crafted link can't send users
 * to another site (open redirect). Falls back otherwise.
 */
export function safeReturnTo(
  value: string | null | undefined,
  fallback: string
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  // Backslashes are treated like slashes by some browsers ("/\evil.com").
  if (value.includes("\\")) return fallback;
  return value;
}

/** Build `path?returnTo=<from>`. */
export function withReturnTo(path: string, from: string): string {
  return `${path}?${new URLSearchParams({ [returnToParam]: from })}`;
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("safeReturnTo", () => {
    it("keeps same-site paths", () => {
      expect(safeReturnTo("/dash/jobs?page=2", "/dash")).toBe("/dash/jobs?page=2");
    });
    it("rejects other sites and junk", () => {
      for (const bad of [null, "", "dash", "//evil.com", "/\\evil.com", "https://evil.com"]) {
        expect(safeReturnTo(bad, "/dash")).toBe("/dash");
      }
    });
  });

  describe("withReturnTo", () => {
    it("encodes the origin path", () => {
      expect(withReturnTo("/dash/jobs/new", "/dash/jobs?page=2")).toBe(
        "/dash/jobs/new?returnTo=%2Fdash%2Fjobs%3Fpage%3D2"
      );
    });
  });
}
