import { describe, expect, it, vi } from "vitest";
import { fromPromise } from "xstate";

import { asyncInterpret } from "~/utils/asyncInterpret";
import type { JobCreationFormValues } from "./components/JobCreationForm/validation";
import {
  updateJobMachine,
  type UpdatedJob,
  type UpdatePositionInput,
} from "./updateJobMachine";

function machineWith({
  findEmployerByName = async () => null,
  insertEmployer = async () => 50,
  updatePosition = async ({ jobId, values }) => ({ id: jobId, title: values.title }),
}: {
  findEmployerByName?: (input: { name: string }) => Promise<number | null>;
  insertEmployer?: (input: { name: string }) => Promise<number>;
  updatePosition?: (input: UpdatePositionInput) => Promise<UpdatedJob | null>;
} = {}) {
  const find = vi.fn(findEmployerByName);
  const insert = vi.fn(insertEmployer);
  const update = vi.fn(updatePosition);
  const machine = updateJobMachine.provide({
    actors: {
      findEmployerByName: fromPromise(({ input }) => find(input)),
      insertEmployer: fromPromise(({ input }) => insert(input)),
      updatePosition: fromPromise(({ input }) => update(input)),
    },
  });
  return { machine, find, insert, update };
}

const blank: JobCreationFormValues = {
  title: "Engineer",
  employerName: "",
  postingUrl: "",
  payRangeLower: "",
  payRangeUpper: "",
  notes: "",
};

const submit = (values: Partial<JobCreationFormValues>) => ({
  type: "job.submit" as const,
  ...blank,
  ...values,
});

const run = (machine: ReturnType<typeof machineWith>["machine"], values = {}, jobId = "7") =>
  asyncInterpret(machine, { input: { jobId }, initialEvent: submit(values) });

describe("updateJobMachine", () => {
  it("updates a job and clears its employer when none is named", async () => {
    const { machine, find, update } = machineWith();
    const state = await run(machine, { notes: "Called recruiter" });
    expect(state.value).toBe("updated");
    expect(state.output).toEqual({ job: { id: 7, title: "Engineer" } });
    expect(find).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      jobId: 7,
      values: { ...blank, notes: "Called recruiter" },
      employerId: null,
    });
  });

  it("reuses an existing employer", async () => {
    const { machine, insert, update } = machineWith({ findEmployerByName: async () => 9 });
    await run(machine, { employerName: " Acme " });
    expect(insert).not.toHaveBeenCalled();
    expect(update.mock.calls[0][0].employerId).toBe(9);
  });

  it("creates a new employer when the name is new", async () => {
    const { machine, insert, update } = machineWith();
    await run(machine, { employerName: "Newco" });
    expect(insert).toHaveBeenCalledWith({ name: "Newco" });
    expect(update.mock.calls[0][0].employerId).toBe(50);
  });

  it("reports a missing (or someone else's) job", async () => {
    const { machine } = machineWith({ updatePosition: async () => null });
    expect((await run(machine)).value).toBe("notFound");
  });

  it("stops at invalid values with field errors", async () => {
    const { machine, update } = machineWith();
    const state = await run(machine, { title: "" });
    expect(state.value).toBe("awaitingValues");
    expect(state.context.problem).toBe("invalidInput");
    expect(state.context.fieldErrors).toEqual({ title: "A title is required." });
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    ["employer lookup", { findEmployerByName: () => Promise.reject(new Error("x")) }],
    ["employer insert", { insertEmployer: () => Promise.reject(new Error("x")) }],
    ["update", { updatePosition: () => Promise.reject(new Error("x")) }],
  ])("recovers when the %s fails", async (_, stubs) => {
    const { machine } = machineWith(stubs);
    const state = await run(machine, { employerName: "Acme" });
    expect(state.value).toBe("awaitingValues");
    expect(state.context.problem).toBe("unavailable");
  });

  it.each([undefined, "abc", "0"])("rejects job id %j", async (jobId) => {
    const { machine, update } = machineWith();
    const state = await asyncInterpret(machine, { input: { jobId } });
    expect(state.value).toBe("invalid");
    expect(update).not.toHaveBeenCalled();
  });
});
