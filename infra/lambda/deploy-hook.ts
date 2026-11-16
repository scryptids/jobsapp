/**
 * ECS blue/green lifecycle hook: moves the SQLite writer role between
 * service revisions using the app's S3 control protocol
 * (`app/src/ops/control.ts`).
 *
 * Stages handled:
 * - POST_TEST_TRAFFIC_SHIFT: green serves test traffic (read-only standby);
 *   smoke-check it through the ALB test rule.
 * - PRE_PRODUCTION_TRAFFIC_SHIFT: production is still on blue. Ask blue to
 *   release and wait until a green task is the active writer. Writes in
 *   between get 503 + Retry-After (the "brief write pause").
 * - PRODUCTION_TRAFFIC_SHIFT: also re-invoked on rollback. When traffic is
 *   going back to blue, hand the writer role back to blue's revision.
 * - POST_PRODUCTION_TRAFFIC_SHIFT: check production is writable.
 *
 * Long waits return IN_PROGRESS; ECS re-invokes after `callBackDelay`
 * seconds with our `hookDetails`.
 */

import { DescribeServiceRevisionsCommand, ECSClient } from "@aws-sdk/client-ecs";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

import {
  type ControlDoc,
  createControlStore,
  handoffRequested,
  readControl,
  updateControl,
} from "../../app/src/ops/control";

type HookEvent = {
  executionId: string;
  lifecycleStage: string;
  resourceArn: string;
  executionDetails: {
    serviceArn: string;
    targetServiceRevisionArn: string;
    testTrafficWeights?: Record<string, number>;
    productionTrafficWeights?: Record<string, number>;
  };
  hookDetails?: Record<string, unknown>;
};

type HookResult = {
  hookStatus: "SUCCEEDED" | "FAILED" | "IN_PROGRESS";
  callBackDelay?: number;
  hookDetails?: Record<string, unknown>;
};

const store = createControlStore({
  bucket: process.env.REPLICA_BUCKET!,
  prefix: process.env.REPLICA_PREFIX ?? "",
  region: process.env.AWS_REGION,
});
const ecs = new ECSClient({});
const secrets = new SecretsManagerClient({});
const baseUrl = process.env.APP_URL!; // https://jobs.example.com
const handoffTimeoutMs = 4 * 60_000;
const smokeTimeoutMs = 5 * 60_000;

let testHeader: Promise<string> | null = null;
function testTrafficHeader(): Promise<string> {
  testHeader ??= secrets
    .send(new GetSecretValueCommand({ SecretId: process.env.TEST_TRAFFIC_SECRET_ARN! }))
    .then((r) => r.SecretString!);
  return testHeader;
}

function log(message: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ message, ...extra }));
}

type Readyz = { role?: string; writable?: boolean; dbReady?: boolean; taskDefinition?: string };

async function readyz(test: boolean): Promise<Readyz | null> {
  try {
    const headers: Record<string, string> = { "cache-control": "no-cache" };
    if (test) headers["x-jobsapp-test-traffic"] = await testTrafficHeader();
    const res = await fetch(`${baseUrl}/readyz`, { headers, signal: AbortSignal.timeout(5000) });
    return (await res.json()) as Readyz;
  } catch (e) {
    log("readyz failed", { test, error: String(e) });
    return null;
  }
}

async function loginPageOk(test: boolean): Promise<boolean> {
  const headers: Record<string, string> = {};
  if (test) headers["x-jobsapp-test-traffic"] = await testTrafficHeader();
  const res = await fetch(`${baseUrl}/login`, { headers, signal: AbortSignal.timeout(5000) }).catch(
    () => null
  );
  return res?.status === 200;
}

/** `family:revision` of a service revision's task definition. */
async function taskDefinitionOf(serviceRevisionArn: string): Promise<string> {
  const res = await ecs.send(
    new DescribeServiceRevisionsCommand({ serviceRevisionArns: [serviceRevisionArn] })
  );
  const arn = res.serviceRevisions?.[0]?.taskDefinition;
  if (!arn) throw new Error(`No task definition for ${serviceRevisionArn}`);
  return arn.split("/").pop()!; // arn:...:task-definition/family:rev → family:rev
}

function startedAt(details: Record<string, unknown> | undefined): number {
  return typeof details?.startedAt === "number" ? details.startedAt : Date.now();
}

function retry(details: Record<string, unknown>, delay = 5): HookResult {
  return { hookStatus: "IN_PROGRESS", callBackDelay: delay, hookDetails: details };
}

/**
 * Wait until a task of `candidate` is the active writer, requesting a
 * handoff once. With `alwaysHandoff`, a writer already on `candidate`
 * doesn't count (blue and green share a task definition on a forced
 * redeploy, so only a completed handoff proves green holds it).
 */
async function moveWriterTo(
  candidate: string,
  reason: string,
  details: Record<string, unknown>,
  { alwaysHandoff = false } = {}
): Promise<HookResult> {
  const since = startedAt(details);
  const control = await readControl(store);

  if (!control) {
    // First deployment ever: the new task claims an empty bucket by itself.
    return Date.now() - since > handoffTimeoutMs
      ? { hookStatus: "FAILED" }
      : retry({ ...details, startedAt: since });
  }

  const doc = control.doc;
  if (doc.state === "active" && doc.writer?.taskDefinition === candidate) {
    const handedOff = details.requested && doc.epoch > Number(details.fromEpoch);
    if (handedOff || (!details.requested && !alwaysHandoff)) {
      log("writer is on the candidate", { candidate, epoch: doc.epoch });
      return { hookStatus: "SUCCEEDED" };
    }
  }

  if (!details.requested) {
    await updateControl(store, (d: ControlDoc | null) =>
      d ? handoffRequested(d, { reason, candidateTaskDefinition: candidate, by: "deploy-hook" }, new Date()) : null
    );
    log("requested handoff", { candidate, reason, fromEpoch: doc.epoch });
    return retry({ ...details, startedAt: since, requested: true, fromEpoch: doc.epoch }, 3);
  }

  if (doc.state === "active" && doc.epoch > Number(details.fromEpoch) && doc.writer?.taskDefinition !== candidate) {
    log("a different revision claimed the writer role", { writer: doc.writer });
    return { hookStatus: "FAILED" };
  }
  if (Date.now() - since > handoffTimeoutMs) {
    log("handoff timed out", { state: doc.state, epoch: doc.epoch });
    return { hookStatus: "FAILED" };
  }
  return retry(details, 3);
}

async function smoke(test: boolean, want: (r: Readyz) => boolean, details: Record<string, unknown>) {
  const since = startedAt(details);
  const r = await readyz(test);
  if (r && want(r) && (await loginPageOk(test))) return { hookStatus: "SUCCEEDED" } as HookResult;
  if (Date.now() - since > smokeTimeoutMs) {
    log("smoke check timed out", { test, last: r });
    return { hookStatus: "FAILED" } as HookResult;
  }
  return retry({ ...details, startedAt: since }, 10);
}

export async function handler(event: HookEvent): Promise<HookResult> {
  const { lifecycleStage, executionDetails } = event;
  const details = event.hookDetails ?? {};
  log("hook invoked", { lifecycleStage, executionDetails, details });

  try {
    switch (lifecycleStage) {
      case "POST_TEST_TRAFFIC_SHIFT":
        return await smoke(true, (r) => r.dbReady === true, details);

      case "PRE_PRODUCTION_TRAFFIC_SHIFT": {
        const target = executionDetails.targetServiceRevisionArn;
        const weights = executionDetails.productionTrafficWeights ?? {};
        const hasBlue = Object.entries(weights).some(([arn, w]) => arn !== target && w > 0);
        const green = await taskDefinitionOf(target);
        // Initial deployment: no blue to hand over from; green claims the
        // empty bucket itself, so just wait for it to be the writer.
        return await moveWriterTo(green, "deploy", details, { alwaysHandoff: hasBlue });
      }

      case "PRODUCTION_TRAFFIC_SHIFT": {
        const weights = executionDetails.productionTrafficWeights ?? {};
        const target = executionDetails.targetServiceRevisionArn;
        const rollingBack = weights[target] === 0;
        if (!rollingBack) return { hookStatus: "SUCCEEDED" };
        const blueRevision = Object.entries(weights).find(([, w]) => w === 100)?.[0];
        if (!blueRevision) return { hookStatus: "SUCCEEDED" };
        const blue = await taskDefinitionOf(blueRevision);
        log("rollback: moving writer back", { blue });
        const result = await moveWriterTo(blue, "rollback", details);
        // A rollback must not itself fail; keep trying until ECS times out.
        return result.hookStatus === "FAILED" ? retry({ ...details, requested: false }, 10) : result;
      }

      case "POST_PRODUCTION_TRAFFIC_SHIFT":
        return await smoke(false, (r) => r.writable === true, details);

      default:
        return { hookStatus: "SUCCEEDED" };
    }
  } catch (e) {
    log("hook error", { error: String(e) });
    // Transient AWS errors shouldn't roll a deploy back on the first try.
    const errors = Number(details.errors ?? 0) + 1;
    return errors > 5 ? { hookStatus: "FAILED" } : retry({ ...details, errors }, 10);
  }
}
