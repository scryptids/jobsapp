/**
 * Labels for "back" links that return to where the user came from.
 * @module
 */

import { employersListPath, homePath, jobsListPath } from "./routes";

/** Label for a link back to `returnTo` (a same-site path). */
export function backLabel(returnTo: string): string {
  const { pathname } = new URL(returnTo, "http://x");
  if (pathname === homePath) return "Back to dashboard";
  if (pathname === jobsListPath) return "Back to all jobs";
  if (pathname === employersListPath) return "Back to employers";
  if (pathname.startsWith(`${employersListPath}/`)) return "Back to employer";
  if (pathname.startsWith(`${jobsListPath}/`)) return "Back to job";
  return "Go back";
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  describe("backLabel", () => {
    it("names known pages", () => {
      expect(backLabel("/dash")).toBe("Back to dashboard");
      expect(backLabel("/dash/jobs?page=2")).toBe("Back to all jobs");
      expect(backLabel("/dash/jobs/4")).toBe("Back to job");
      expect(backLabel("/dash/employers")).toBe("Back to employers");
      expect(backLabel("/dash/employers/3")).toBe("Back to employer");
      expect(backLabel("/elsewhere")).toBe("Go back");
    });
  });
}
