import { beforeEach, describe, expect, it } from "vitest";

import { testDb } from "~/test/db";
import { ForeignKeyError, UniqueEmailError } from "./errors";
import { employersRepo, positionsRepo, usersRepo } from "./repository.server";

const me = 1;
const other = 2;
const fields = {
  title: "Engineer",
  postingUrl: null,
  payRangeLower: 85000.5,
  payRangeUpper: 99_999_999.99,
  notes: null,
};

beforeEach(() => testDb.reset(me, other));

describe("positionsRepo", () => {
  it("round-trips pay through integer cents", async () => {
    const { id } = await positionsRepo.insert(me, fields, { employerId: null });
    const job = await positionsRepo.byId(me, id);
    expect(job).toMatchObject({ payRangeLower: 85000.5, payRangeUpper: 99_999_999.99 });
  });

  it("refuses to attach another user's employer", async () => {
    const theirs = await employersRepo.insert(other, { name: "Theirs", notes: null });
    await expect(
      positionsRepo.insert(me, fields, { employerId: theirs.id })
    ).rejects.toBeInstanceOf(ForeignKeyError);

    const { id } = await positionsRepo.insert(me, fields, { employerId: null });
    await expect(
      positionsRepo.update(me, id, { ...fields, employerId: theirs.id })
    ).rejects.toBeInstanceOf(ForeignKeyError);
    expect(testDb.positions()).toHaveLength(1);
  });

  it("creates the named employer in the same transaction", async () => {
    await positionsRepo.insert(me, fields, { employerId: null, newEmployerName: "Acme" });
    const [employer] = testDb.employers();
    expect(employer).toMatchObject({ name: "Acme", user_id: me });
    expect(testDb.positions()[0].employer_id).toBe(employer.id);
  });

  it("only lists, reads, updates and deletes the user's own jobs", async () => {
    const { id } = await positionsRepo.insert(other, fields, { employerId: null });
    expect(await positionsRepo.list(me, { limit: 10 })).toEqual([]);
    expect(await positionsRepo.byId(me, id)).toBeNull();
    expect(await positionsRepo.update(me, id, { ...fields, employerId: null })).toBeNull();
    expect(await positionsRepo.delete(me, id)).toBe(false);
    expect(testDb.positions()).toHaveLength(1);
  });
});

describe("employersRepo", () => {
  it("finds by name case-insensitively, per user", async () => {
    const mine = await employersRepo.insert(me, { name: "Acme", notes: null });
    await employersRepo.insert(other, { name: "acme", notes: null });
    expect(await employersRepo.findIdByName(me, "ACME")).toBe(mine.id);
    expect(await employersRepo.findIdByName(me, "Acm%")).toBeNull();
  });

  it("refuses to delete an employer with jobs", async () => {
    const e = await employersRepo.insert(me, { name: "Acme", notes: null });
    await positionsRepo.insert(me, fields, { employerId: e.id });
    await expect(employersRepo.delete(me, e.id)).rejects.toBeInstanceOf(ForeignKeyError);
    expect(await employersRepo.jobCount(me, e.id)).toBe(1);
    expect(await employersRepo.jobCount(other, e.id)).toBeNull();
  });
});

describe("usersRepo", () => {
  it("rejects duplicate and non-lowercase emails", async () => {
    await usersRepo.insert("a@example.com", "hash");
    await expect(usersRepo.insert("a@example.com", "hash")).rejects.toBeInstanceOf(
      UniqueEmailError
    );
    await expect(usersRepo.insert("B@example.com", "hash")).rejects.toThrow(/CHECK/);
  });
});
