import { beforeEach, describe, expect, it, vi } from "vitest";

import { employersRepo } from "~/db/repository.server";
import { failNext, testDb } from "~/test/db";
import {
  authedCookie,
  dataOf,
  formRequest,
  getRequest,
  locationOf,
  run,
  statusOf,
} from "~/test/http";
import { action as deleteEmployer } from "./employers-delete";
import { loader as employerPage } from "./employers-detail";
import { action as editEmployer } from "./employers-edit";
import { loader as employersPage } from "./employers-index";
import { action as createEmployer } from "./employers-submit";
import { action as deleteJob } from "./jobs-delete";
import { action as submitJob } from "./jobs-submit";


vi.spyOn(console, "error").mockImplementation(() => {});

const userId = 3;
const otherUserId = 4;

const employer = (fields: Record<string, string>) => ({
  type: "employer.submit",
  name: "Acme",
  notes: "",
  ...fields,
});

async function create(fields: Record<string, string> = {}, asUser = userId) {
  const cookie = await authedCookie(asUser);
  return run(() =>
    createEmployer({
      request: formRequest("/dash/employers/new", employer(fields), { cookie }),
    } as never)
  );
}

/** Create an employer and return its id. */
async function createId(fields: Record<string, string> = {}, asUser = userId) {
  await create(fields, asUser);
  return testDb.employers().at(-1)!.id;
}

async function edit(id: number | string, fields: Record<string, string>, asUser = userId) {
  const cookie = await authedCookie(asUser);
  return run(() =>
    editEmployer({
      request: formRequest(`/dash/employers/${id}/edit`, employer(fields), { cookie }),
      params: { employerId: String(id) },
    } as never)
  );
}

async function remove(id: number | string, asUser = userId, fields: Record<string, string> = {}) {
  const cookie = await authedCookie(asUser);
  return run(() =>
    deleteEmployer({
      request: formRequest(`/dash/employers/${id}/delete`, fields, { cookie }),
      params: { employerId: String(id) },
    } as never)
  );
}

async function addJob(title: string, employerName: string, asUser = userId) {
  const cookie = await authedCookie(asUser);
  await submitJob({
    request: formRequest(
      "/dash/jobs/new",
      { type: "job.submit", title, employerName },
      { cookie }
    ),
  } as never);
  return testDb.positions().at(-1)!.id;
}

async function get<T>(
  loader: (args: never) => Promise<T>,
  path: string,
  params: Record<string, string> = {},
  asUser = userId
) {
  const cookie = await authedCookie(asUser);
  return run(() => loader({ request: getRequest(path, { cookie }), params } as never));
}

beforeEach(() => testDb.reset(userId, otherUserId));

describe("POST /dash/employers/new", () => {
  it("creates an employer with notes and opens its page", async () => {
    const res = await create({ name: " Acme ", notes: "Remote friendly" });
    const [saved] = testDb.employers();
    expect(saved).toMatchObject({ name: "Acme", notes: "Remote friendly", user_id: userId });
    expect(locationOf(res)).toBe(`/dash/employers/${saved.id}`);
  });

  it("refuses a name the user already has, ignoring case", async () => {
    await create({ name: "Acme" });
    const res = await create({ name: "ACME" });
    expect(statusOf(res)).toBe(409);
    expect(dataOf(res)).toMatchObject({
      status: "invalid",
      fieldErrors: { name: "You already have an employer named ACME." },
    });
    expect(testDb.employers()).toHaveLength(1);
  });

  it("allows a name another user has", async () => {
    await create({ name: "Acme" }, otherUserId);
    expect(locationOf(await create({ name: "Acme" }))).toMatch(/^\/dash\/employers\/\d+$/);
  });

  it("returns 400 for a blank name", async () => {
    expect(statusOf(await create({ name: " " }))).toBe(400);
  });
});

describe("POST /dash/employers/:employerId/edit", () => {
  it("renames and updates notes, then returns", async () => {
    const id = await createId();
    const res = await edit(id, { name: "Acme Inc", notes: "Hiring manager: Lee", returnTo: "/dash/employers" });
    expect(locationOf(res)).toBe("/dash/employers");
    expect(testDb.employers()[0]).toMatchObject({ name: "Acme Inc", notes: "Hiring manager: Lee" });
  });

  it("allows changing only the case of its own name", async () => {
    const id = await createId({ name: "acme" });
    expect(locationOf(await edit(id, { name: "Acme" }))).toBe(`/dash/employers/${id}`);
  });

  it("refuses another of the user's employer names", async () => {
    await createId({ name: "Globex" });
    const id = await createId({ name: "Acme" });
    expect(statusOf(await edit(id, { name: "globex" }))).toBe(409);
  });

  it("returns 404 for another user's employer", async () => {
    const id = await createId({}, otherUserId);
    expect(statusOf(await edit(id, { name: "Mine now" }))).toBe(404);
    expect(testDb.employers()[0].name).toBe("Acme");
  });
});

describe("GET /dash/employers", () => {
  it("lists only the user's employers with job counts", async () => {
    await addJob("Engineer", "Acme");
    await addJob("Designer", "Acme");
    await createId({ name: "Globex" });
    await addJob("Spy", "Acme", otherUserId);
    const res = await get(employersPage, "/dash/employers");
    expect(dataOf(res)).toEqual({
      employers: [
        { id: expect.any(Number), name: "Acme", jobCount: 2 },
        { id: expect.any(Number), name: "Globex", jobCount: 0 },
      ],
    });
  });
});

describe("GET /dash/employers/:employerId", () => {
  it("shows the employer's notes and all its jobs", async () => {
    await addJob("Engineer", "Acme");
    await addJob("Other", "Globex");
    await addJob("Designer", "Acme");
    const acme = testDb.employers().find((e) => e.name === "Acme")!;
    await edit(acme.id, { name: "Acme", notes: "Good benefits" });
    const res = await get(employerPage, `/dash/employers/${acme.id}`, {
      employerId: String(acme.id),
    });
    expect(dataOf(res)).toMatchObject({
      employer: {
        name: "Acme",
        notes: "Good benefits",
        positions: [{ title: "Engineer" }, { title: "Designer" }],
      },
    });
  });

  it("404s for another user's employer", async () => {
    const id = await createId({}, otherUserId);
    const res = await get(employerPage, `/dash/employers/${id}`, { employerId: String(id) });
    expect(statusOf(res)).toBe(404);
  });
});

describe("POST /dash/employers/:employerId/delete", () => {
  it("refuses while the employer has jobs, then deletes once they're gone", async () => {
    const jobId = await addJob("Engineer", "Acme");
    const { id } = testDb.employers()[0];

    const blocked = await remove(id);
    expect(statusOf(blocked)).toBe(409);
    expect(dataOf(blocked)).toEqual({ ok: false, reason: "has-jobs" });

    const cookie = await authedCookie(userId);
    await deleteJob({
      request: formRequest(`/dash/jobs/${jobId}/delete`, {}, { cookie }),
      params: { jobId: String(jobId) },
    } as never);

    const res = await remove(id, userId, { returnTo: "/dash/employers" });
    expect(locationOf(res)).toBe("/dash/employers");
    expect(testDb.employers()).toHaveLength(0);
  });

  it("maps a foreign-key refusal to 409 if a job appears after the count", async () => {
    await addJob("Engineer", "Acme");
    const { id } = testDb.employers()[0];
    vi.spyOn(employersRepo, "jobCount").mockResolvedValueOnce(0);
    expect(statusOf(await remove(id))).toBe(409);
  });

  it("returns 404 for another user's employer", async () => {
    const id = await createId({}, otherUserId);
    expect(statusOf(await remove(id))).toBe(404);
    expect(testDb.employers()).toHaveLength(1);
  });

  it("returns 400 for a malformed id and 500 when the store fails", async () => {
    expect(statusOf(await remove("abc"))).toBe(400);
    const id = await createId();
    failNext(employersRepo, "delete");
    expect(statusOf(await remove(id))).toBe(500);
  });
});
