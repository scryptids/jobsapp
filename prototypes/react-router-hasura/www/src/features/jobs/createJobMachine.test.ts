import { describe, expect, it, vi } from "vitest";
import { fromPromise } from "xstate";

import { asyncInterpret } from "~/utils/asyncInterpret";
import type { JobCreationFormValues } from "./components/JobCreationForm/validation";
import {
  createJobMachine,
  type CreatedJob,
  type InsertPositionInput,
} from "./createJobMachine";

function machineWith({
  findEmployerByName = async () => null,
  insertPosition = async ({ values }) => ({ id: 1, title: values.title }),
}: {
  findEmployerByName?: (input: { name: string }) => Promise<number | null>;
  insertPosition?: (input: InsertPositionInput) => Promise<CreatedJob>;
} = {}) {
  const find = vi.fn(findEmployerByName);
  const insert = vi.fn(insertPosition);
  const machine = createJobMachine.provide({
    actors: {
      findEmployerByName: fromPromise(({ input }) => find(input)),
      insertPosition: fromPromise(({ input }) => insert(input)),
    },
  });
  return { machine, find, insert };
}

const blank: JobCreationFormValues = {
  title: "Engineer",
  employerName: "",
  postingUrl: "",
  payRangeLower: "",
  payRangeUpper: "",
};

const submit = (values: Partial<JobCreationFormValues>) => ({
  type: "job.submit" as const,
  ...blank,
  ...values,
});

describe("createJobMachine", () => {
  it("creates a job without an employer, skipping the lookup", async () => {
    const { machine, find, insert } = machineWith();
    const state = await asyncInterpret(machine, { initialEvent: submit({}) });
    expect(state.value).toBe("created");
    expect(state.output).toEqual({ job: { id: 1, title: "Engineer" } });
    expect(find).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith({ values: blank, employerId: null });
  });

  it("reuses an existing employer", async () => {
    const { machine, find, insert } = machineWith({ findEmployerByName: async () => 9 });
    const state = await asyncInterpret(machine, {
      initialEvent: submit({ employerName: "  Acme " }),
    });
    expect(state.value).toBe("created");
    expect(find).toHaveBeenCalledWith({ name: "Acme" });
    expect(insert.mock.calls[0][0].employerId).toBe(9);
  });

  it("leaves a new employer for the insert to create", async () => {
    const { machine, insert } = machineWith({ findEmployerByName: async () => null });
    await asyncInterpret(machine, { initialEvent: submit({ employerName: "Newco" }) });
    expect(insert.mock.calls[0][0]).toMatchObject({
      employerId: null,
      values: { employerName: "Newco" },
    });
  });

  it("stops at invalid values with field errors", async () => {
    const { machine, insert } = machineWith();
    const state = await asyncInterpret(machine, {
      initialEvent: submit({ title: " ", payRangeLower: "9", payRangeUpper: "1" }),
    });
    expect(state.value).toBe("awaitingValues");
    expect(state.context.problem).toBe("invalidInput");
    expect(state.context.fieldErrors).toEqual({
      title: "A title is required.",
      payRangeUpper: "Must be at least the minimum pay.",
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it.each([
    ["employer lookup", { findEmployerByName: () => Promise.reject(new Error("x")) }],
    ["insert", { insertPosition: () => Promise.reject(new Error("x")) }],
  ])("recovers when the %s fails", async (_, stubs) => {
    const { machine } = machineWith(stubs);
    const state = await asyncInterpret(machine, {
      initialEvent: submit({ employerName: "Acme" }),
    });
    expect(state.value).toBe("awaitingValues");
    expect(state.context.problem).toBe("unavailable");
    expect(state.context.values?.employerName).toBe("Acme");
  });

  it("ignores extra event fields", async () => {
    const { machine, insert } = machineWith();
    await asyncInterpret(machine, {
      initialEvent: { ...submit({}), user_id: "999" } as never,
    });
    expect(insert.mock.calls[0][0].values).toEqual(blank);
  });
});
