import { describe, expect, it } from "vitest";

import {
  activated,
  claimed,
  generationAt,
  handoffRequested,
  leaseMs,
  mayClaim,
  released,
  renewed,
  withMaintenance,
  type ControlDoc,
} from "./control";

const blue = { taskArn: "task/blue", taskDefinition: "app:1" };
const green = { taskArn: "task/green", taskDefinition: "app:2" };
const t0 = new Date("2026-11-15T12:00:00Z");
const later = (ms: number) => new Date(t0.getTime() + ms);

function activeDoc(): ControlDoc {
  return activated(claimed(null, blue, t0), blue, 1, t0)!;
}

describe("control transitions", () => {
  it("lets the first task claim an empty bucket and activate generation 1", () => {
    expect(mayClaim(null, blue, t0)).toBe(true);
    const doc = activeDoc();
    expect(doc).toMatchObject({ epoch: 1, generation: 1, state: "active" });
    expect(doc.writer?.taskArn).toBe(blue.taskArn);
  });

  it("blocks claims while the lease is live, allows them once expired", () => {
    const doc = activeDoc();
    expect(mayClaim(doc, green, later(1000))).toBe(false);
    expect(mayClaim(doc, green, later(leaseMs + 6000))).toBe(true);
    // A writer that fenced itself may reclaim too.
    expect(mayClaim(doc, blue, later(leaseMs + 6000))).toBe(true);
  });

  it("renewing extends the lease only for the owner", () => {
    const doc = activeDoc();
    const r = renewed(doc, blue, later(30_000))!;
    expect(new Date(r.writer!.leaseExpiresAt).getTime()).toBe(later(30_000 + leaseMs).getTime());
    expect(renewed(doc, green, later(30_000))).toBeNull();
  });

  it("hands off: the releasing writer is excluded, the candidate preferred", () => {
    const h = handoffRequested(
      activeDoc(),
      { reason: "deploy", candidateTaskDefinition: green.taskDefinition, by: "hook" },
      t0
    )!;
    expect(h.state).toBe("handoff");
    expect(mayClaim(h, green, t0)).toBe(false); // writer hasn't released yet

    const r = released(h, blue, t0)!;
    expect(r).toMatchObject({ state: "released", writer: null });
    expect(mayClaim(r, blue, t0)).toBe(false);
    expect(mayClaim(r, green, t0)).toBe(true);
    const other = { taskArn: "task/x", taskDefinition: "app:3" };
    expect(mayClaim(r, other, later(1000))).toBe(false);
    expect(mayClaim(r, other, later(61_000))).toBe(true);
  });

  it("claiming keeps the old generation until activation", () => {
    const r = released(handoffRequested(activeDoc(), { reason: "x", by: "hook" }, t0)!, blue, t0)!;
    const c = claimed(r, green, t0);
    expect(c).toMatchObject({ state: "claiming", generation: 1, epoch: 2 });
    expect(activated(c, blue, 2, t0)).toBeNull(); // not the claimer
    expect(activated(c, green, 2, t0)).toMatchObject({ state: "active", generation: 2 });
  });

  it("maintenance survives a change of writer", () => {
    const m = withMaintenance(activeDoc(), { reason: "restore" }, "ops", t0);
    expect(m.state).toBe("maintenance");
    const c = claimed(m, green, t0);
    expect(activated(c, green, 2, t0)?.state).toBe("maintenance");
    expect(withMaintenance(m, null, "ops", t0).state).toBe("active");
  });
});

describe("generationAt", () => {
  it("picks the newest generation activated at or before the time", () => {
    const history = [
      { generation: 1, activeAt: "2026-11-01T00:00:00Z" },
      { generation: 2, activeAt: "2026-11-10T00:00:00Z" },
    ];
    expect(generationAt(history, new Date("2026-10-01T00:00:00Z"))).toBeNull();
    expect(generationAt(history, new Date("2026-11-05T00:00:00Z"))).toBe(1);
    expect(generationAt(history, new Date("2026-11-12T00:00:00Z"))).toBe(2);
  });
});
