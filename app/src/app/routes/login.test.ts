import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hashPassword } from "~/features/auth/password.server";
import { defaultMaxLoginAttempts } from "~/features/auth/loginMachine";
import { usersRepo } from "~/db/repository.server";
import { failNext, testDb } from "~/test/db";
import {
  authedCookie,
  CookieJar,
  dataOf,
  formRequest,
  getRequest,
  locationOf,
  run,
  setCookieNames,
  statusOf,
} from "~/test/http";
import type { LoginViewData } from "./login";
import { action, loader } from "./login";


// Machines log actor failures; keep test output quiet.
vi.spyOn(console, "error").mockImplementation(() => {});

const email = "user@example.com";
const password = "correct horse";

function login(jar: CookieJar, fields: Record<string, string>) {
  return run(async () => {
    const res = await action({
      request: formRequest(
        "/login",
        { type: "credentials.submit", ...fields },
        { cookie: jar.header() }
      ),
    } as never);
    jar.store(res);
    return res;
  });
}

describe("POST /login", () => {
  beforeEach(async () => {
    testDb.reset();
    testDb.insertUser({ id: 5, email, password_hash: await hashPassword(password) });
  });

  it("signs in, sets the session and clears the flow cookie", async () => {
    const jar = new CookieJar();
    const res = await login(jar, { email: "User@Example.com", password });
    expect(statusOf(res)).toBe(302);
    expect(locationOf(res)).toBe("/dash");
    expect(setCookieNames(res)).toEqual(expect.arrayContaining(["__session", "_login"]));
    expect(jar.has("__session")).toBe(true);
    expect(jar.has("_login")).toBe(false);
  });

  it("returns 400 with field errors for malformed input", async () => {
    const res = await login(new CookieJar(), { email: "nope", password: "" });
    expect(statusOf(res)).toBe(400);
    expect(dataOf<LoginViewData>(res).fieldErrors).toEqual({
      email: "Please enter a valid email address.",
      password: "Password is required.",
    });
  });

  it("returns 401 for a wrong password and keeps the flow in a cookie", async () => {
    const jar = new CookieJar();
    const res = await login(jar, { email, password: "wrong" });
    expect(statusOf(res)).toBe(401);
    expect(dataOf<LoginViewData>(res)).toMatchObject({
      step: "credentials",
      email,
      error: "Invalid email or password.",
    });
    expect(jar.has("_login")).toBe(true);
  });

  it("locks out after repeated failures, even with the right password", async () => {
    const jar = new CookieJar();
    for (let i = 1; i < defaultMaxLoginAttempts; i++) {
      expect(statusOf(await login(jar, { email, password: `wrong${i}` }))).toBe(401);
    }
    const locked = await login(jar, { email, password: "wrong-last" });
    expect(statusOf(locked)).toBe(429);
    expect(dataOf<LoginViewData>(locked).step).toBe("lockedOut");

    const stillLocked = await login(jar, { email, password });
    expect(statusOf(stillLocked)).toBe(429);
  });

  it("shows the locked-out step on reload", async () => {
    const jar = new CookieJar();
    for (let i = 0; i < defaultMaxLoginAttempts; i++) {
      await login(jar, { email, password: "wrong" });
    }
    const page = await loader({
      request: getRequest("/login", { cookie: jar.header() }),
    } as never);
    expect(statusOf(page)).toBe(429);
    expect(dataOf<LoginViewData>(page).step).toBe("lockedOut");
  });

  it("loader never overwrites the flow cookie the action just set", async () => {
    // Document POSTs run the action, then the loader, with the same
    // (pre-action) request cookies.
    const jar = new CookieJar();
    await login(jar, { email, password: "wrong" });
    const page = await loader({
      request: getRequest("/login", { cookie: "" }),
    } as never);
    expect(setCookieNames(page)).not.toContain("_login");
  });

  it("starts over when the flow cookie is forged", async () => {
    const res = await run(() =>
      action({
        request: formRequest(
          "/login",
          { type: "credentials.submit", email, password },
          { cookie: "_login=eyJmb3JnZWQiOnRydWV9.bad-signature" }
        ),
      } as never)
    );
    expect(locationOf(res)).toBe("/dash");
  });

  it("returns 500 when the user store is down", async () => {
    failNext(usersRepo, "byEmail");
    const res = await login(new CookieJar(), { email, password });
    expect(statusOf(res)).toBe(500);
  });

  it("rejects unknown events", async () => {
    const res = await run(() =>
      action({ request: formRequest("/login", { type: "xstate.init" }) } as never)
    );
    expect(statusOf(res)).toBe(400);
  });
});

describe("GET /login", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("redirects signed-in users home", async () => {
    const cookie = await authedCookie(1);
    const res = await loader({ request: getRequest("/login", { cookie }) } as never);
    expect(locationOf(res)).toBe("/dash");
  });

  it("shows the credentials step to visitors", async () => {
    const res = await loader({ request: getRequest("/login") } as never);
    expect(statusOf(res)).toBe(200);
    expect(dataOf<LoginViewData>(res).step).toBe("credentials");
  });

  it("signs in as the seeded user with dev autologin", async () => {
    vi.stubEnv("DEV_AUTOLOGIN", "true");
    vi.stubEnv("NODE_ENV", "development");
    const res = await loader({ request: getRequest("/login") } as never);
    expect(locationOf(res)).toBe("/dash");
    expect(setCookieNames(res)).toContain("__session");
  });

  it("never autologins in production", async () => {
    vi.stubEnv("DEV_AUTOLOGIN", "true");
    vi.stubEnv("NODE_ENV", "production");
    const res = await loader({ request: getRequest("/login") } as never);
    expect(locationOf(res)).toBeNull();
  });
});
