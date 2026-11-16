import { describe, expect, it, vi } from "vitest";
import { fromPromise } from "xstate";

import { asyncInterpret } from "~/utils/asyncInterpret";
import { signupMachine, type CreateUserResult } from "./signupMachine";

function withCreateUser(
  impl: (input: { email: string; password: string }) => Promise<CreateUserResult>
) {
  return signupMachine.provide({
    actors: { createUser: fromPromise(({ input }) => impl(input)) },
  });
}

const submit = (email: string, password: string) => ({
  type: "credentials.submit" as const,
  email,
  password,
});

describe("signupMachine", () => {
  it("waits for credentials", async () => {
    const state = await asyncInterpret(signupMachine);
    expect(state.value).toBe("awaitingCredentials");
    expect(state.hasTag("pause")).toBe(true);
  });

  it("registers a user with valid credentials", async () => {
    const createUser = vi.fn(async () => ({ ok: true as const, userId: 7 }));
    const state = await asyncInterpret(withCreateUser(createUser), {
      initialEvent: submit("new@example.com", "longenough"),
    });
    expect(state.value).toBe("registered");
    expect(state.output).toEqual({ userId: 7 });
    expect(createUser).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "longenough",
    });
  });

  it("rejects invalid credentials without creating a user", async () => {
    const createUser = vi.fn();
    const state = await asyncInterpret(withCreateUser(createUser), {
      initialEvent: submit("nope", "short"),
    });
    expect(state.value).toBe("awaitingCredentials");
    expect(state.context.problem).toBe("invalidInput");
    expect(state.context.fieldErrors).toEqual({
      email: "Please enter a valid email address.",
      password: "Password must be at least 8 characters.",
    });
    expect(createUser).not.toHaveBeenCalled();
  });

  it("reports a taken email", async () => {
    const state = await asyncInterpret(
      withCreateUser(async () => ({ ok: false, reason: "email-taken" })),
      { initialEvent: submit("taken@example.com", "longenough") }
    );
    expect(state.value).toBe("awaitingCredentials");
    expect(state.context.problem).toBe("emailTaken");
    expect(state.context.email).toBe("taken@example.com");
  });

  it("recovers from a store failure", async () => {
    const state = await asyncInterpret(
      withCreateUser(async () => {
        throw new Error("db down");
      }),
      { initialEvent: submit("new@example.com", "longenough") }
    );
    expect(state.value).toBe("awaitingCredentials");
    expect(state.context.problem).toBe("unavailable");
  });

  it("never keeps the password in context", async () => {
    const state = await asyncInterpret(
      withCreateUser(async () => ({ ok: false, reason: "email-taken" })),
      { initialEvent: submit("a@b.co", "secret-password") }
    );
    expect(JSON.stringify(state.context)).not.toContain("secret-password");
  });
});
