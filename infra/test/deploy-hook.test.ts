import { beforeEach, describe, expect, it, vi } from "vitest";

import { activated, claimed, released, type ControlDoc } from "../../app/src/ops/control";

// In-memory control document instead of S3.
const state = vi.hoisted(() => ({ doc: null as ControlDoc | null, epochWrites: 0 }));

vi.mock("../../app/src/ops/control", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../app/src/ops/control")>();
  return {
    ...actual,
    createControlStore: () => ({}),
    readControl: async () => (state.doc ? { doc: state.doc, etag: "e" } : null),
    updateControl: async (_store: unknown, change: (d: ControlDoc | null) => ControlDoc | null) => {
      const next = change(state.doc);
      if (next) state.doc = next;
      return next ? { doc: next, etag: "e" } : null;
    },
  };
});

const revisions: Record<string, string> = { "rev/blue": "app:1", "rev/green": "app:2" };
vi.mock("@aws-sdk/client-ecs", () => ({
  ECSClient: class {
    async send(cmd: { input: { serviceRevisionArns: string[] } }) {
      const arn = cmd.input.serviceRevisionArns[0];
      return { serviceRevisions: [{ taskDefinition: `arn:aws:ecs:r:1:task-definition/${revisions[arn]}` }] };
    }
  },
  DescribeServiceRevisionsCommand: class {
    constructor(public input: unknown) {}
  },
}));
vi.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManagerClient: class {
    async send() {
      return { SecretString: "token" };
    }
  },
  GetSecretValueCommand: class {
    constructor(public input: unknown) {}
  },
}));

process.env.REPLICA_BUCKET = "bucket";
process.env.APP_URL = "https://app.test";
const { handler } = await import("../lambda/deploy-hook");

const blueTask = { taskArn: "task/blue", taskDefinition: "app:1" };
const greenTask = { taskArn: "task/green", taskDefinition: "app:2" };
const now = new Date();

function writerIs(task: typeof blueTask, epoch = 1) {
  let doc = activated(claimed(null, task, now), task, epoch, now)!;
  doc = { ...doc, epoch };
  state.doc = doc;
}

/** Simulate tasks reacting to a handoff request: writer releases, candidate claims. */
function tasksReact(claimer: typeof blueTask) {
  const doc = state.doc!;
  if (doc.state !== "handoff") return;
  const r = released(doc, doc.writer!, now)!;
  state.doc = activated(claimed(r, claimer, now), claimer, r.generation + 1, now)!;
}

const event = (stage: string, weights: Record<string, number>, hookDetails?: Record<string, unknown>) => ({
  executionId: "x",
  lifecycleStage: stage,
  resourceArn: "svc",
  executionDetails: {
    serviceArn: "svc",
    targetServiceRevisionArn: "rev/green",
    productionTrafficWeights: weights,
  },
  hookDetails,
});

beforeEach(() => {
  state.doc = null;
});

describe("PRE_PRODUCTION_TRAFFIC_SHIFT", () => {
  it("requests a handoff to green, then succeeds once green writes", async () => {
    writerIs(blueTask);
    const first = await handler(event("PRE_PRODUCTION_TRAFFIC_SHIFT", { "rev/blue": 100, "rev/green": 0 }));
    expect(first.hookStatus).toBe("IN_PROGRESS");
    expect(state.doc).toMatchObject({ state: "handoff", handoff: { candidateTaskDefinition: "app:2" } });

    tasksReact(greenTask);
    const second = await handler(
      event("PRE_PRODUCTION_TRAFFIC_SHIFT", { "rev/blue": 100, "rev/green": 0 }, first.hookDetails)
    );
    expect(second.hookStatus).toBe("SUCCEEDED");
  });

  it("still hands off when blue and green share a task definition", async () => {
    revisions["rev/green"] = "app:1";
    try {
      writerIs(blueTask);
      const first = await handler(event("PRE_PRODUCTION_TRAFFIC_SHIFT", { "rev/blue": 100, "rev/green": 0 }));
      expect(first.hookStatus).toBe("IN_PROGRESS");
      expect(state.doc?.state).toBe("handoff");
    } finally {
      revisions["rev/green"] = "app:2";
    }
  });

  it("on the first deployment, waits for green to claim the empty bucket", async () => {
    const first = await handler(event("PRE_PRODUCTION_TRAFFIC_SHIFT", { "rev/green": 0 }));
    expect(first.hookStatus).toBe("IN_PROGRESS");
    writerIs(greenTask);
    const second = await handler(event("PRE_PRODUCTION_TRAFFIC_SHIFT", { "rev/green": 0 }, first.hookDetails));
    expect(second.hookStatus).toBe("SUCCEEDED");
    expect(state.doc?.state).toBe("active");
  });

  it("fails (rolls back) when the handoff doesn't finish in time", async () => {
    writerIs(blueTask);
    const res = await handler(
      event("PRE_PRODUCTION_TRAFFIC_SHIFT", { "rev/blue": 100 }, { startedAt: Date.now() - 10 * 60_000, requested: true, fromEpoch: 1 })
    );
    expect(res.hookStatus).toBe("FAILED");
  });
});

describe("PRODUCTION_TRAFFIC_SHIFT", () => {
  it("succeeds immediately on a forward shift", async () => {
    writerIs(greenTask, 2);
    const res = await handler(event("PRODUCTION_TRAFFIC_SHIFT", { "rev/blue": 0, "rev/green": 100 }));
    expect(res.hookStatus).toBe("SUCCEEDED");
  });

  it("on rollback, moves the writer back to blue", async () => {
    writerIs(greenTask, 2);
    const first = await handler(event("PRODUCTION_TRAFFIC_SHIFT", { "rev/blue": 100, "rev/green": 0 }));
    expect(first.hookStatus).toBe("IN_PROGRESS");
    expect(state.doc?.handoff?.candidateTaskDefinition).toBe("app:1");
    tasksReact(blueTask);
    const second = await handler(
      event("PRODUCTION_TRAFFIC_SHIFT", { "rev/blue": 100, "rev/green": 0 }, first.hookDetails)
    );
    expect(second.hookStatus).toBe("SUCCEEDED");
    expect(state.doc?.writer?.taskArn).toBe("task/blue");
  });

  it("on rollback before any handoff, leaves blue as writer", async () => {
    writerIs(blueTask);
    const res = await handler(event("PRODUCTION_TRAFFIC_SHIFT", { "rev/blue": 100, "rev/green": 0 }));
    expect(res.hookStatus).toBe("SUCCEEDED");
    expect(state.doc?.state).toBe("active");
  });
});
