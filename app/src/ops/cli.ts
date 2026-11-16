/**
 * Operator CLI, bundled into the image as `build/ops.js` and run by the SSM
 * Automation runbooks as a one-off ECS task (same image, same IAM role):
 *
 *   node build/ops.js status
 *   node build/ops.js verify
 *   node build/ops.js restore --timestamp 2026-11-15T10:30:00Z [--mode dry-run|apply]
 *   node build/ops.js maintenance on --reason "..." | off
 *   node build/ops.js export [--timestamp ...]
 *   node build/ops.js handoff [--reason ...]   (writer releases; any task may claim)
 *
 * Every command prints one JSON result line last, and exits non-zero on
 * failure, so runbooks can surface it.
 * @module
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

import { PutObjectCommand } from "@aws-sdk/client-s3";

import { assertIntegrity, openDatabase, runMigrations } from "~/db/client.server";
import {
  claimed,
  createControlStore,
  generationAt,
  handoffRequested,
  leaseMs,
  listGenerations,
  readControl,
  recordGenerationStart,
  renewed,
  updateControl,
  withMaintenance,
  writeControl,
  type ControlDoc,
  type Versioned,
} from "./control";
import * as litestream from "./litestream.server";
import { resolveIdentity } from "./writer.server";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    timestamp: { type: "string" },
    mode: { type: "string", default: "dry-run" },
    reason: { type: "string", default: "operator request" },
  },
});

const bucket = process.env.REPLICA_BUCKET;
if (!bucket) throw new Error("REPLICA_BUCKET is required");
const store = createControlStore({
  bucket,
  prefix: process.env.REPLICA_PREFIX ?? "",
  region: process.env.AWS_REGION,
  endpoint: process.env.S3_ENDPOINT,
});
const ls: litestream.LitestreamEnv = {
  bin: process.env.LITESTREAM_BIN ?? "litestream",
  store,
  region: process.env.AWS_REGION,
  endpoint: process.env.S3_ENDPOINT,
};

const log = (message: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ level: "info", component: "ops", message, ...extra }));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function scratchFile(name: string) {
  const dir = fs.mkdtempSync(path.join(process.env.DATA_DIR ?? os.tmpdir(), "ops-"));
  return path.join(dir, name);
}

function parseTimestamp(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const at = new Date(raw);
  if (Number.isNaN(at.getTime())) throw new Error(`Invalid --timestamp: ${raw}`);
  if (at > new Date()) throw new Error("--timestamp is in the future");
  return at;
}

function rowCounts(file: string) {
  const h = openDatabase(file, { readonly: true });
  try {
    const count = (t: string) =>
      (h.db.$client.prepare(`SELECT count(*) AS n FROM ${t}`).get() as { n: number }).n;
    return { users: count("users"), employers: count("employers"), positions: count("positions") };
  } finally {
    h.db.$client.close();
  }
}

/** Restore (generation, timestamp) to a scratch file, check it and migrate it. */
async function restoreChecked(at?: Date) {
  const control = await readControl(store);
  if (!control || control.doc.generation === 0) throw new Error("No replica exists yet.");
  let generation = control.doc.generation;
  if (at) {
    const g = generationAt(await listGenerations(store), at);
    if (g === null) throw new Error(`No generation was live at ${at.toISOString()}.`);
    generation = g;
  }
  const file = scratchFile("restore.db");
  const ok = await litestream.restore(ls, generation, file, { timestamp: at });
  if (!ok) throw new Error(`Generation ${generation} has no backups.`);
  const h = openDatabase(file);
  try {
    assertIntegrity(h);
    runMigrations(h);
  } finally {
    h.db.$client.close();
  }
  return { file, generation, control, counts: rowCounts(file) };
}

async function status() {
  const control = await readControl(store);
  return { control: control?.doc ?? null };
}

async function verify() {
  const { file, generation, counts } = await restoreChecked();
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
  // EMF metric; alarmed on absence (see infra OpsStack).
  console.log(
    JSON.stringify({
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          { Namespace: "Jobsapp", Dimensions: [[]], Metrics: [{ Name: "BackupVerified", Unit: "Count" }] },
        ],
      },
      BackupVerified: 1,
    })
  );
  return { ok: true, generation, counts };
}

async function maintenance(mode: string | undefined) {
  if (mode !== "on" && mode !== "off") throw new Error("Usage: maintenance on|off");
  const me = await resolveIdentity();
  const written = await updateControl(store, (doc) =>
    doc ? withMaintenance(doc, mode === "on" ? { reason: values.reason! } : null, me.taskArn, new Date()) : null
  );
  if (!written) throw new Error("No control document; nothing has been deployed yet.");
  return { state: written.doc.state, maintenance: written.doc.maintenance };
}

/**
 * Point-in-time restore. Takes the writer role through the normal handoff
 * protocol (so the app is read-only, never writing, while it runs), seeds a
 * new generation from the restored database, and releases it to the
 * service. The previous generations stay in S3, so a restore can be undone
 * by restoring again to a later time.
 */
async function restorePointInTime() {
  const at = parseTimestamp(values.timestamp);
  if (!at) throw new Error("--timestamp is required");
  if (values.mode !== "dry-run" && values.mode !== "apply") {
    throw new Error("--mode must be dry-run or apply");
  }

  const checked = await restoreChecked(at);
  log("restored and verified", { generation: checked.generation, at, counts: checked.counts });
  if (values.mode === "dry-run") {
    fs.rmSync(path.dirname(checked.file), { recursive: true, force: true });
    return { dryRun: true, fromGeneration: checked.generation, at, counts: checked.counts };
  }

  const me = { ...(await resolveIdentity()), taskDefinition: "ops:restore" };

  // 1. Ask the writer to release, reserving the claim for us.
  await updateControl(store, (doc) =>
    doc
      ? handoffRequested(doc, { reason: `pitr to ${at.toISOString()}`, candidateTaskDefinition: me.taskDefinition, by: me.taskArn }, new Date())
      : null
  );

  // 2. Wait for the release, then claim.
  let mine: Versioned<ControlDoc> | null = null;
  for (let i = 0; i < 90 && !mine; i++) {
    const current = await readControl(store);
    if (current?.doc.state === "released") {
      mine = await writeControl(store, claimed(current.doc, me, new Date()), current.etag);
    } else {
      await sleep(2000);
    }
  }
  if (!mine) throw new Error("The writer did not release within 3 minutes; nothing was changed.");
  log("holding the writer role", { epoch: mine.doc.epoch });

  // 3. Seed the next generation from the restored file, keeping our lease.
  let latest = mine;
  const keepAlive = setInterval(async () => {
    const next = renewed(latest.doc, me, new Date());
    const w = next && (await writeControl(store, next, latest.etag).catch(() => null));
    if (w) latest = w;
  }, 10_000);
  const nextGeneration = mine.doc.generation + 1;
  try {
    await litestream.syncOnce(ls, checked.file, nextGeneration, { forceSnapshot: true });
  } finally {
    clearInterval(keepAlive);
  }

  // 4. Publish it and hand the role back to the service.
  const now = new Date();
  const published = await updateControl(store, (doc) => {
    if (!doc || doc.writer?.taskArn !== me.taskArn) return null;
    return {
      ...doc,
      generation: nextGeneration,
      state: "released",
      writer: null,
      handoff: {
        requestedAt: now.toISOString(),
        reason: "pitr complete",
        candidateTaskDefinition: null,
        excludeTaskArns: [me.taskArn],
      },
      updatedAt: now.toISOString(),
      updatedBy: me.taskArn,
    };
  });
  if (!published) throw new Error(`Lost the writer role (lease ${leaseMs / 1000}s) before publishing.`);
  await recordGenerationStart(store, { ...published.doc, updatedAt: now.toISOString() });
  fs.rmSync(path.dirname(checked.file), { recursive: true, force: true });
  return {
    restored: true,
    at,
    fromGeneration: checked.generation,
    newGeneration: nextGeneration,
    counts: checked.counts,
  };
}

/**
 * Restore a copy into `exports/` in the replica bucket. Deliberately no
 * presigned URL: logs are readable more widely than the data should be.
 * The operator downloads it with their own IAM permissions (and KMS
 * access); exports expire via the bucket lifecycle rule.
 */
async function exportDatabase() {
  const checked = await restoreChecked(parseTimestamp(values.timestamp));
  const key = `${store.prefix}exports/${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
  await store.client.send(
    new PutObjectCommand({ Bucket: store.bucket, Key: key, Body: fs.readFileSync(checked.file) })
  );
  fs.rmSync(path.dirname(checked.file), { recursive: true, force: true });
  return {
    key,
    download: `aws s3 cp s3://${store.bucket}/${key} ./jobsapp-export.db`,
    counts: checked.counts,
  };
}

/** Ask the current writer to release; the next eligible task claims. */
async function handoff() {
  const me = await resolveIdentity();
  const before = await readControl(store);
  const written = await updateControl(store, (doc) =>
    doc ? handoffRequested(doc, { reason: values.reason!, by: me.taskArn }, new Date()) : null
  );
  if (!written) throw new Error("No control document; nothing has been deployed yet.");
  for (let i = 0; i < 90; i++) {
    const c = await readControl(store);
    if (c && c.doc.state === "active" && c.doc.epoch > (before?.doc.epoch ?? 0)) {
      return { writer: c.doc.writer?.taskArn, epoch: c.doc.epoch, generation: c.doc.generation };
    }
    await sleep(2000);
  }
  throw new Error("No task became the writer within 3 minutes.");
}

const commands: Record<string, () => Promise<unknown>> = {
  status,
  verify,
  restore: restorePointInTime,
  maintenance: () => maintenance(positionals[1]),
  export: exportDatabase,
  handoff,
};

const command = commands[positionals[0] ?? ""];
if (!command) {
  console.error(`Usage: ops <${Object.keys(commands).join("|")}> [options]`);
  process.exit(2);
}

try {
  console.log(JSON.stringify({ ok: true, result: await command() }));
  process.exit(0);
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e instanceof Error ? e.message : e) }));
  process.exit(1);
}
