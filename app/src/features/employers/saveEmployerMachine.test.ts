import { describe, expect, it, vi } from "vitest";
import { fromPromise } from "xstate";

import { asyncInterpret } from "~/utils/asyncInterpret";
import {
  saveEmployerMachine,
  type SaveEmployerActorInput,
  type SavedEmployer,
} from "./saveEmployerMachine";

function machineWith({
  findEmployerByName = async () => null,
  saveEmployer = async ({ employerId, values }) => ({
    id: employerId ?? 1,
    name: values.name.trim(),
  }),
}: {
  findEmployerByName?: (input: { name: string }) => Promise<number | null>;
  saveEmployer?: (input: SaveEmployerActorInput) => Promise<SavedEmployer | null>;
} = {}) {
  const find = vi.fn(findEmployerByName);
  const save = vi.fn(saveEmployer);
  const machine = saveEmployerMachine.provide({
    actors: {
      findEmployerByName: fromPromise(({ input }) => find(input)),
      saveEmployer: fromPromise(({ input }) => save(input)),
    },
  });
  return { machine, find, save };
}

const submit = (name: string, notes = "") => ({
  type: "employer.submit" as const,
  name,
  notes,
});

describe("saveEmployerMachine", () => {
  it("creates an employer", async () => {
    const { machine, save } = machineWith();
    const state = await asyncInterpret(machine, {
      input: { employerId: null },
      initialEvent: submit(" Acme ", "Great culture"),
    });
    expect(state.value).toBe("saved");
    expect(state.output).toEqual({ employer: { id: 1, name: "Acme" } });
    expect(save).toHaveBeenCalledWith({
      employerId: null,
      values: { name: " Acme ", notes: "Great culture" },
    });
  });

  it("updates an employer, allowing a change of case in its own name", async () => {
    const { machine, save } = machineWith({ findEmployerByName: async () => 4 });
    const state = await asyncInterpret(machine, {
      input: { employerId: "4" },
      initialEvent: submit("ACME"),
    });
    expect(state.value).toBe("saved");
    expect(save.mock.calls[0][0].employerId).toBe(4);
  });

  it("refuses a name another of the user's employers has", async () => {
    const { machine, save } = machineWith({ findEmployerByName: async () => 9 });
    const state = await asyncInterpret(machine, {
      input: { employerId: "4" },
      initialEvent: submit("Acme"),
    });
    expect(state.value).toBe("awaitingValues");
    expect(state.context.problem).toBe("nameTaken");
    expect(state.context.fieldErrors).toEqual({
      name: "You already have an employer named Acme.",
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("stops at invalid values", async () => {
    const { machine, find } = machineWith();
    const state = await asyncInterpret(machine, {
      input: { employerId: null },
      initialEvent: submit(""),
    });
    expect(state.context.problem).toBe("invalidInput");
    expect(find).not.toHaveBeenCalled();
  });

  it("reports a missing (or someone else's) employer", async () => {
    const { machine } = machineWith({ saveEmployer: async () => null });
    const state = await asyncInterpret(machine, {
      input: { employerId: "4" },
      initialEvent: submit("Acme"),
    });
    expect(state.value).toBe("notFound");
  });

  it.each([
    ["name lookup", { findEmployerByName: () => Promise.reject(new Error("x")) }],
    ["save", { saveEmployer: () => Promise.reject(new Error("x")) }],
  ])("recovers when the %s fails", async (_, stubs) => {
    const { machine } = machineWith(stubs);
    const state = await asyncInterpret(machine, {
      input: { employerId: null },
      initialEvent: submit("Acme"),
    });
    expect(state.value).toBe("awaitingValues");
    expect(state.context.problem).toBe("unavailable");
  });

  it.each([undefined, "", "abc"])("rejects employer id %j", async (employerId) => {
    const { machine } = machineWith();
    const state = await asyncInterpret(machine, { input: { employerId } });
    expect(state.value).toBe("invalid");
  });
});
