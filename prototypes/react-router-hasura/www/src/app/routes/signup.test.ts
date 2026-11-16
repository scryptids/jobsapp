import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FakeSdk } from "~/test/fakeSdk";
import {
  authedCookie,
  dataOf,
  formRequest,
  getRequest,
  locationOf,
  run,
  setCookieNames,
  statusOf,
} from "~/test/http";
import { action, loader } from "./signup";

const fake = vi.hoisted(() => ({ sdk: undefined as unknown as FakeSdk }));
vi.mock("~/api.server", async () => {
  const { createFakeSdk } = await import("~/test/fakeSdk");
  fake.sdk = createFakeSdk();
  return { sdk: fake.sdk, adminSdk: fake.sdk };
});

// Machines log actor failures; keep test output quiet.
vi.spyOn(console, "error").mockImplementation(() => {});

const signup = (fields: Record<string, string>) =>
  run(() =>
    action({
      request: formRequest("/signup", { type: "credentials.submit", ...fields }),
    } as never)
  );

describe("POST /signup", () => {
  beforeEach(() => fake.sdk.reset());

  it("creates the user, starts a session and redirects home", async () => {
    const res = await signup({ email: " New@Example.com ", password: "longenough" });
    expect(statusOf(res)).toBe(302);
    expect(locationOf(res)).toBe("/dash");
    expect(setCookieNames(res)).toContain("__session");
    expect(fake.sdk.db.users).toHaveLength(1);
    expect(fake.sdk.db.users[0].email).toBe("new@example.com");
    expect(fake.sdk.db.users[0].password_hash).toMatch(/^scrypt\$/);
  });

  it("returns 400 with field errors for invalid input", async () => {
    const res = await signup({ email: "nope", password: "short" });
    expect(statusOf(res)).toBe(400);
    expect(dataOf(res)).toMatchObject({
      email: "nope",
      fieldErrors: {
        email: "Please enter a valid email address.",
        password: "Password must be at least 8 characters.",
      },
    });
    expect(fake.sdk.db.users).toHaveLength(0);
  });

  it("returns 409 when the email is taken", async () => {
    await signup({ email: "a@b.co", password: "longenough" });
    const res = await signup({ email: "A@B.co", password: "longenough" });
    expect(statusOf(res)).toBe(409);
    expect(dataOf(res)).toMatchObject({
      fieldErrors: { email: "An account with this email already exists." },
    });
  });

  it("returns 500 with a message when the store fails", async () => {
    fake.sdk.failNext("insertUser");
    const res = await signup({ email: "a@b.co", password: "longenough" });
    expect(statusOf(res)).toBe(500);
    expect(dataOf<{ error: string }>(res).error).toMatch(/went wrong/);
  });

  it("returns 400 for an unknown event type", async () => {
    const res = await run(() =>
      action({ request: formRequest("/signup", { type: "bogus" }) } as never)
    );
    expect(statusOf(res)).toBe(400);
  });
});

describe("GET /signup", () => {
  it("redirects signed-in users home", async () => {
    const cookie = await authedCookie(1);
    const res = await run(() =>
      loader({ request: getRequest("/signup", { cookie }) } as never)
    );
    expect(locationOf(res)).toBe("/dash");
  });

  it("renders the form for visitors", async () => {
    expect(await loader({ request: getRequest("/signup") } as never)).toBeNull();
  });
});
