import { describe, expect, it, vi } from "vitest";
import { fromPromise } from "xstate";

import { asyncInterpret } from "~/utils/asyncInterpret";
import { deleteJobMachine } from "./deleteJobMachine";

function run(
  jobId: string | undefined,
  deletePosition: (input: { jobId: number }) => Promise<boolean>
) {
  const spy = vi.fn(deletePosition);
  const machine = deleteJobMachine.provide({
    actors: { deletePosition: fromPromise(({ input }) => spy(input)) },
  });
  return { spy, state: asyncInterpret(machine, { input: { jobId } }) };
}

describe("deleteJobMachine", () => {
  it("deletes the job", async () => {
    const { spy, state } = run("12", async () => true);
    expect((await state).value).toBe("deleted");
    expect(spy).toHaveBeenCalledWith({ jobId: 12 });
  });

  it("reports a missing (or someone else's) job", async () => {
    expect((await run("12", async () => false).state).value).toBe("notFound");
  });

  it("reports a store failure", async () => {
    const { state } = run("12", () => Promise.reject(new Error("down")));
    expect((await state).value).toBe("failed");
  });

  it.each([undefined, "", "abc", "0", "-3", "1.5"])(
    "rejects job id %j without calling the store",
    async (jobId) => {
      const { spy, state } = run(jobId, async () => true);
      expect((await state).value).toBe("invalid");
      expect(spy).not.toHaveBeenCalled();
    }
  );
});
