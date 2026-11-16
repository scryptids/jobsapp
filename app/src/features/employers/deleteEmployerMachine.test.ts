import { describe, expect, it, vi } from "vitest";
import { fromPromise } from "xstate";

import { asyncInterpret } from "~/utils/asyncInterpret";
import {
  deleteEmployerMachine,
  type DeleteEmployerResult,
} from "./deleteEmployerMachine";

function run(
  employerId: string | undefined,
  {
    countJobs = async () => 0,
    deleteEmployer = async () => "deleted",
  }: {
    countJobs?: () => Promise<number | null>;
    deleteEmployer?: () => Promise<DeleteEmployerResult>;
  } = {}
) {
  const remove = vi.fn(deleteEmployer);
  const machine = deleteEmployerMachine.provide({
    actors: {
      countJobs: fromPromise(() => countJobs()),
      deleteEmployer: fromPromise(() => remove()),
    },
  });
  return { remove, state: asyncInterpret(machine, { input: { employerId } }) };
}

describe("deleteEmployerMachine", () => {
  it("deletes an employer without jobs", async () => {
    expect((await run("3").state).value).toBe("deleted");
  });

  it("refuses while the employer has jobs", async () => {
    const { remove, state } = run("3", { countJobs: async () => 2 });
    expect((await state).value).toBe("hasJobs");
    expect(remove).not.toHaveBeenCalled();
  });

  it("reports jobs added between the count and the delete", async () => {
    const { state } = run("3", { deleteEmployer: async () => "hasJobs" });
    expect((await state).value).toBe("hasJobs");
  });

  it("reports a missing (or someone else's) employer", async () => {
    expect((await run("3", { countJobs: async () => null }).state).value).toBe("notFound");
    expect((await run("3", { deleteEmployer: async () => "notFound" }).state).value).toBe(
      "notFound"
    );
  });

  it("reports store failures", async () => {
    const fail = () => Promise.reject(new Error("down"));
    expect((await run("3", { countJobs: fail }).state).value).toBe("failed");
    expect((await run("3", { deleteEmployer: fail }).state).value).toBe("failed");
  });

  it("rejects a malformed id", async () => {
    const { remove, state } = run("abc");
    expect((await state).value).toBe("invalid");
    expect(remove).not.toHaveBeenCalled();
  });
});
