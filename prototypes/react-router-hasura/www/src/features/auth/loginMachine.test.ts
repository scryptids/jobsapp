import { describe, expect, it, vi } from "vitest";
import { fromPromise, type Snapshot } from "xstate";

import { runToPause } from "~/utils/asyncInterpret";
import { loginMachine, type LoginEvent, type LoginInput } from "./loginMachine";

type Stubs = {
  authenticateUser?: (input: { email: string; password: string }) => Promise<number | null>;
  verifyOtp?: (input: { userId: number; otp: string }) => Promise<boolean>;
  secondFactorEnabled?: boolean;
};

function machineWith(stubs: Stubs = {}) {
  return loginMachine.provide({
    actors: {
      authenticateUser: fromPromise(({ input }) =>
        (stubs.authenticateUser ?? (async () => null))(input)
      ),
      verifyOtp: fromPromise(({ input }) =>
        (stubs.verifyOtp ?? (async () => false))(input)
      ),
    },
    guards: { secondFactorEnabled: () => stubs.secondFactorEnabled ?? false },
  });
}

/**
 * Simulates the HTTP flow: each call is one request that resumes from the
 * previous request's persisted snapshot, after a JSON round trip (as it
 * would through the cookie).
 */
function session(machine: ReturnType<typeof machineWith>, input?: LoginInput) {
  let persisted: Snapshot<unknown> | undefined;
  return async (event?: LoginEvent) => {
    const result = await runToPause(machine, {
      input: persisted ? undefined : input,
      initialState: persisted,
      initialEvent: event,
    });
    persisted = JSON.parse(JSON.stringify(result.persistedSnapshot));
    return { ...result, persistedJson: JSON.stringify(result.persistedSnapshot) };
  };
}

const creds = (email: string, password: string): LoginEvent => ({
  type: "credentials.submit",
  email,
  password,
});

describe("loginMachine", () => {
  it("waits for credentials", async () => {
    const { snapshot } = await runToPause(machineWith());
    expect(snapshot.value).toBe("awaitingCredentials");
  });

  it("signs straight in with dev autologin", async () => {
    const { snapshot } = await runToPause(machineWith(), {
      input: { autologinUserId: 1 },
    });
    expect(snapshot.value).toBe("authenticated");
    expect(snapshot.output).toEqual({ userId: 1 });
  });

  it("authenticates valid credentials", async () => {
    const authenticateUser = vi.fn(async () => 42);
    const send = session(machineWith({ authenticateUser }));
    const { snapshot } = await send(creds("a@b.co", "pw"));
    expect(snapshot.value).toBe("authenticated");
    expect(snapshot.output).toEqual({ userId: 42 });
    expect(authenticateUser).toHaveBeenCalledWith({ email: "a@b.co", password: "pw" });
  });

  it("rejects malformed input without hitting the store", async () => {
    const authenticateUser = vi.fn();
    const send = session(machineWith({ authenticateUser }));
    const { snapshot } = await send(creds("nope", ""));
    expect(snapshot.value).toBe("awaitingCredentials");
    expect(snapshot.context.problem).toBe("invalidInput");
    expect(snapshot.context.fieldErrors).toEqual({
      email: "Please enter a valid email address.",
      password: "Password is required.",
    });
    expect(snapshot.context.attempts).toBe(0);
    expect(authenticateUser).not.toHaveBeenCalled();
  });

  it("counts failed attempts across requests and locks out at the limit", async () => {
    const send = session(machineWith(), { maxAttempts: 3 });

    let { snapshot } = await send(creds("a@b.co", "wrong1"));
    expect(snapshot.value).toBe("awaitingCredentials");
    expect(snapshot.context).toMatchObject({ attempts: 1, problem: "badCredentials" });

    ({ snapshot } = await send(creds("a@b.co", "wrong2")));
    expect(snapshot.context.attempts).toBe(2);

    ({ snapshot } = await send(creds("a@b.co", "wrong3")));
    expect(snapshot.value).toBe("lockedOut");
    expect(snapshot.hasTag("failure")).toBe(true);
  });

  it("ignores further submissions once locked out", async () => {
    const authenticateUser = vi.fn(async () => null);
    const send = session(machineWith({ authenticateUser }), { maxAttempts: 1 });
    await send(creds("a@b.co", "wrong"));
    authenticateUser.mockResolvedValue(42 as never);
    const { snapshot } = await send(creds("a@b.co", "right"));
    expect(snapshot.value).toBe("lockedOut");
    expect(authenticateUser).toHaveBeenCalledTimes(1);
  });

  it("recovers from a store failure without counting an attempt", async () => {
    const send = session(
      machineWith({
        authenticateUser: async () => {
          throw new Error("db down");
        },
      })
    );
    const { snapshot } = await send(creds("a@b.co", "pw"));
    expect(snapshot.value).toBe("awaitingCredentials");
    expect(snapshot.context).toMatchObject({ problem: "unavailable", attempts: 0 });
  });

  it("never persists the password", async () => {
    const send = session(machineWith());
    const { persistedJson } = await send(creds("a@b.co", "hunter2-secret"));
    expect(persistedJson).not.toContain("hunter2-secret");
  });

  describe("with a second factor", () => {
    const authenticateUser = async () => 42;

    it("pauses for a one-time code, then authenticates in a later request", async () => {
      const verifyOtp = vi.fn(async ({ otp }: { otp: string }) => otp === "123456");
      const send = session(
        machineWith({ authenticateUser, verifyOtp, secondFactorEnabled: true })
      );

      let { snapshot } = await send(creds("a@b.co", "pw"));
      expect(snapshot.value).toBe("awaitingOtp");
      expect(snapshot.hasTag("pause")).toBe(true);

      ({ snapshot } = await send({ type: "otp.submit", otp: "000000" }));
      expect(snapshot.value).toBe("awaitingOtp");
      expect(snapshot.context).toMatchObject({ problem: "badOtp", attempts: 1 });

      ({ snapshot } = await send({ type: "otp.submit", otp: "123456" }));
      expect(snapshot.value).toBe("authenticated");
      expect(snapshot.output).toEqual({ userId: 42 });
      expect(verifyOtp).toHaveBeenLastCalledWith({ userId: 42, otp: "123456" });
    });

    it("ignores credentials while waiting for the code", async () => {
      const send = session(machineWith({ authenticateUser, secondFactorEnabled: true }));
      await send(creds("a@b.co", "pw"));
      const { snapshot } = await send(creds("other@b.co", "pw"));
      expect(snapshot.value).toBe("awaitingOtp");
      expect(snapshot.context.email).toBe("a@b.co");
    });

    it("locks out after too many bad codes", async () => {
      const send = session(
        machineWith({ authenticateUser, secondFactorEnabled: true }),
        { maxAttempts: 2 }
      );
      await send(creds("a@b.co", "pw"));
      await send({ type: "otp.submit", otp: "1" });
      const { snapshot } = await send({ type: "otp.submit", otp: "2" });
      expect(snapshot.value).toBe("lockedOut");
    });
  });
});
