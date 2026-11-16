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
  ...fields,
});

async function submit(fields: Record<string, string>, asUser = userId) {
  const cookie = await authedCookie(asUser);
  return run(() =>
    submitJob({ request: formRequest("/dash/jobs/new", job(fields), { cookie }) } as never)
  );
}

async function remove(jobId: string, asUser = userId) {
  const cookie = await authedCookie(asUser);
  return run(() =>
    deleteJob({
      request: formRequest(`/dash/jobs/${jobId}/delete`, {}, { cookie }),
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
    expect(dataOf(res)).toEqual({ returnTo: "/dash", employerOptions: ["Acme", "Zed"] });
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
