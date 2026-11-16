import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FakeSdk } from "~/test/fakeSdk";
import {
  authedCookie,
  dataOf,
  formRequest,
  getRequest,
  locationOf,
  run,
  statusOf,
} from "~/test/http";
import { action as deleteJob } from "./jobs-delete";
import { action as submitJob, loader as newJobPage } from "./jobs-submit";
import { loader as jobPage } from "./jobs-detail";
import { action as editJob, loader as editJobPage } from "./jobs-edit";

const fake = vi.hoisted(() => ({ sdk: undefined as unknown as FakeSdk }));
vi.mock("~/api.server", async () => {
  const { createFakeSdk } = await import("~/test/fakeSdk");
  fake.sdk = createFakeSdk();
  return { sdk: fake.sdk, adminSdk: fake.sdk };
});

// Machines log actor failures; keep test output quiet.
vi.spyOn(console, "error").mockImplementation(() => {});

const userId = 3;
const otherUserId = 4;

const job = (fields: Record<string, string>) => ({
  type: "job.submit",
  title: "Engineer",
  employerName: "",
  postingUrl: "",
  payRangeLower: "",
  payRangeUpper: "",
  notes: "",
  ...fields,
});

async function submit(fields: Record<string, string>, asUser = userId) {
  const cookie = await authedCookie(asUser);
  return run(() =>
    submitJob({ request: formRequest("/dash/jobs/new", job(fields), { cookie }) } as never)
  );
}

async function remove(jobId: string, asUser = userId, fields: Record<string, string> = {}) {
  const cookie = await authedCookie(asUser);
  return run(() =>
    deleteJob({
      request: formRequest(`/dash/jobs/${jobId}/delete`, fields, { cookie }),
      params: { jobId },
    } as never)
  );
}

type SubmitData = { status: string; job: { id: number; title: string } | null };

beforeEach(() => fake.sdk.reset());

describe("POST /dash/jobs/new", () => {
  it("creates a job with a new employer for the signed-in user", async () => {
    const res = await submit({
      title: " Engineer ",
      employerName: "Acme",
      postingUrl: "https://acme.test/jobs/1",
      payRangeLower: "$90,000",
      payRangeUpper: "120000",
    });
    expect(statusOf(res)).toBe(200);
    expect(dataOf<SubmitData>(res)).toMatchObject({
      status: "created",
      job: { title: "Engineer" },
    });
    expect(fake.sdk.db.employers).toEqual([
      expect.objectContaining({ name: "Acme", user_id: userId }),
    ]);
    expect(fake.sdk.db.positions[0]).toMatchObject({
      user_id: userId,
      posting_url: "https://acme.test/jobs/1",
      pay_range_lower: 90000,
      pay_range_upper: 120000,
    });
  });

  it("reuses the user's employer case-insensitively", async () => {
    await submit({ employerName: "Acme" });
    await submit({ employerName: "ACME" });
    expect(fake.sdk.db.employers).toHaveLength(1);
    expect(new Set(fake.sdk.db.positions.map((p) => p.employer_id)).size).toBe(1);
  });

  it("does not reuse another user's employer", async () => {
    await submit({ employerName: "Acme" }, otherUserId);
    await submit({ employerName: "Acme" });
    expect(fake.sdk.db.employers.map((e) => e.user_id)).toEqual([otherUserId, userId]);
  });

  it("treats LIKE wildcards in the employer name literally", async () => {
    await submit({ employerName: "A_me" });
    await submit({ employerName: "Acme" });
    expect(fake.sdk.db.employers).toHaveLength(2);
  });

  it("returns 400 with field errors for invalid values", async () => {
    const res = await submit({ title: "", postingUrl: "javascript:alert(1)" });
    expect(statusOf(res)).toBe(400);
    expect(dataOf(res)).toMatchObject({
      status: "invalid",
      fieldErrors: { title: "A title is required.", postingUrl: expect.any(String) },
    });
    expect(fake.sdk.db.positions).toHaveLength(0);
  });

  it("returns 500 when saving fails", async () => {
    fake.sdk.failNext("insertPosition");
    const res = await submit({});
    expect(statusOf(res)).toBe(500);
    expect(dataOf<SubmitData>(res).status).toBe("error");
  });

  it("redirects visitors to log in", async () => {
    const res = await run(() =>
      submitJob({ request: formRequest("/dash/jobs/new", job({})) } as never)
    );
    expect(locationOf(res)).toBe("/login");
  });
});

describe("GET /dash/jobs/new", () => {
  it("offers the user's own employers and a safe return path", async () => {
    await submit({ employerName: "Zed" });
    await submit({ employerName: "Acme" });
    await submit({ employerName: "Other" }, otherUserId);
    const cookie = await authedCookie(userId);
    const res = await newJobPage({
      request: getRequest("/dash/jobs/new?returnTo=//evil.test", { cookie }),
    } as never);
    expect(dataOf(res)).toEqual({
      returnTo: "/dash",
      employerOptions: ["Acme", "Zed"],
      employerName: "",
    });
  });
});

describe("POST /dash/jobs/:jobId/delete", () => {
  it("deletes the user's job", async () => {
    const created = dataOf<SubmitData>(await submit({}));
    const res = await remove(String(created.job!.id));
    expect(statusOf(res)).toBe(200);
    expect(dataOf(res)).toEqual({ ok: true, reason: null });
    expect(fake.sdk.db.positions).toHaveLength(0);
  });

  it("returns 404 for another user's job and keeps it", async () => {
    const created = dataOf<SubmitData>(await submit({}, otherUserId));
    const res = await remove(String(created.job!.id));
    expect(statusOf(res)).toBe(404);
    expect(fake.sdk.db.positions).toHaveLength(1);
  });

  it("returns 404 for a missing job", async () => {
    expect(statusOf(await remove("999"))).toBe(404);
  });

  it("returns 400 for a malformed id", async () => {
    expect(statusOf(await remove("abc"))).toBe(400);
  });

  it("returns 500 when the store fails", async () => {
    fake.sdk.failNext("deletePosition");
    expect(statusOf(await remove("1"))).toBe(500);
  });
});

describe("POST /dash/jobs/:jobId/delete with returnTo", () => {
  it("redirects after deleting", async () => {
    const created = dataOf<SubmitData>(await submit({}));
    const res = await remove(String(created.job!.id), userId, { returnTo: "/dash/jobs" });
    expect(locationOf(res)).toBe("/dash/jobs");
  });

  it("ignores an off-site returnTo", async () => {
    const created = dataOf<SubmitData>(await submit({}));
    const res = await remove(String(created.job!.id), userId, { returnTo: "//evil.test" });
    expect(statusOf(res)).toBe(200);
  });
});

async function edit(jobId: string, fields: Record<string, string>, asUser = userId) {
  const cookie = await authedCookie(asUser);
  return run(() =>
    editJob({
      request: formRequest(`/dash/jobs/${jobId}/edit`, job(fields), { cookie }),
      params: { jobId },
    } as never)
  );
}

async function load<T>(
  loader: (args: never) => Promise<T>,
  path: string,
  params: Record<string, string>,
  asUser = userId
) {
  const cookie = await authedCookie(asUser);
  return run(() => loader({ request: getRequest(path, { cookie }), params } as never));
}

describe("GET /dash/jobs/:jobId", () => {
  it("shows the user's job with its notes and employer", async () => {
    const id = dataOf<SubmitData>(
      await submit({ employerName: "Acme", notes: "Met Sam", payRangeLower: "5" })
    ).job!.id;
    const res = await load(jobPage, `/dash/jobs/${id}`, { jobId: String(id) });
    expect(dataOf(res)).toMatchObject({
      job: { id, notes: "Met Sam", pay_range_lower: 5, employer: { name: "Acme" } },
    });
  });

  it.each([
    ["another user's job", otherUserId],
    ["a missing job", null],
  ])("404s for %s", async (_, owner) => {
    const id = owner ? dataOf<SubmitData>(await submit({}, owner)).job!.id : 999;
    const res = await load(jobPage, `/dash/jobs/${id}`, { jobId: String(id) });
    expect(statusOf(res)).toBe(404);
  });

  it("404s for a malformed id", async () => {
    expect(statusOf(await load(jobPage, "/dash/jobs/x", { jobId: "x" }))).toBe(404);
  });
});

describe("GET /dash/jobs/:jobId/edit", () => {
  it("prefills the form from the job", async () => {
    const id = dataOf<SubmitData>(
      await submit({ employerName: "Acme", payRangeUpper: "120,000", notes: "n" })
    ).job!.id;
    const res = await load(editJobPage, `/dash/jobs/${id}/edit?returnTo=/dash`, {
      jobId: String(id),
    });
    expect(dataOf(res)).toMatchObject({
      returnTo: "/dash",
      initialValues: {
        title: "Engineer",
        employerName: "Acme",
        payRangeLower: "",
        payRangeUpper: "120000",
        notes: "n",
      },
      employerOptions: ["Acme"],
    });
  });

  it("404s for another user's job", async () => {
    const id = dataOf<SubmitData>(await submit({}, otherUserId)).job!.id;
    const res = await load(editJobPage, `/dash/jobs/${id}/edit`, { jobId: String(id) });
    expect(statusOf(res)).toBe(404);
  });
});

describe("POST /dash/jobs/:jobId/edit", () => {
  it("saves changes and notes, then returns to the job page", async () => {
    const id = dataOf<SubmitData>(await submit({ employerName: "Acme" })).job!.id;
    const res = await edit(String(id), {
      title: "Staff Engineer",
      employerName: "Acme",
      notes: " Second interview Tuesday ",
    });
    expect(locationOf(res)).toBe(`/dash/jobs/${id}`);
    expect(fake.sdk.db.positions[0]).toMatchObject({
      title: "Staff Engineer",
      notes: "Second interview Tuesday",
    });
    expect(fake.sdk.db.employers).toHaveLength(1);
  });

  it("follows a safe returnTo", async () => {
    const id = dataOf<SubmitData>(await submit({})).job!.id;
    const res = await edit(String(id), { returnTo: "/dash/jobs?page=2" });
    expect(locationOf(res)).toBe("/dash/jobs?page=2");
  });

  it("moves the job to a new employer, or clears it", async () => {
    const id = dataOf<SubmitData>(await submit({ employerName: "Acme" })).job!.id;
    await edit(String(id), { employerName: "Newco" });
    const newco = fake.sdk.db.employers.find((e) => e.name === "Newco")!;
    expect(fake.sdk.db.positions[0].employer_id).toBe(newco.id);
    await edit(String(id), { employerName: "" });
    expect(fake.sdk.db.positions[0].employer_id).toBeNull();
  });

  it("returns 404 for another user's job and leaves it alone", async () => {
    const id = dataOf<SubmitData>(await submit({}, otherUserId)).job!.id;
    const res = await edit(String(id), { title: "Hijacked" });
    expect(statusOf(res)).toBe(404);
    expect(fake.sdk.db.positions[0].title).toBe("Engineer");
  });

  it("returns 400 for invalid values", async () => {
    const id = dataOf<SubmitData>(await submit({})).job!.id;
    const res = await edit(String(id), { title: "" });
    expect(statusOf(res)).toBe(400);
    expect(dataOf(res)).toMatchObject({ status: "invalid" });
  });

  it("returns 500 when saving fails", async () => {
    const id = dataOf<SubmitData>(await submit({})).job!.id;
    fake.sdk.failNext("updatePosition");
    expect(statusOf(await edit(String(id), {}))).toBe(500);
  });
});
