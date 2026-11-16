/**
 * Writer coordinator: decides whether this process may write the SQLite
 * database, using the S3 control document (see `./control`). Enabled with
 * `WRITER_COORDINATION=s3`; without it the app just opens `DATABASE_PATH`.
 *
 * Roles:
 * - **standby**: serves a read-only copy (restored from the latest
 *   generation and migrated, so it also proves the migrations work on real
 *   data). Claims the database when the control document allows it.
 * - **writer**: holds a lease (renewed every 10s), replicates with
 *   Litestream to its own generation, and accepts writes. Releases on a
 *   handoff request or SIGTERM; fences itself (read-only) if it can't renew.
 *
 * Claiming is two-phase so a crash at any point loses nothing:
 *   1. CAS `claiming` (lease held), 2. restore generation g, integrity
 *   check, migrate, 3. snapshot to g+1, 4. CAS `active` with generation g+1.
 * Until step 4 the control document still points at g.
 * @module
 */

import fs from "node:fs";
import path from "node:path";

import {
  assertIntegrity,
  currentDatabase,
  openDatabase,
  runMigrations,
  setDatabase,
  type DbHandle,
} from "~/db/client.server";
import {
  activated,
  claimed,
  createControlStore,
  leaseMs,
  mayClaim,
  readControl,
  recordGenerationStart,
  released,
  renewed,
  writeControl,
  type ControlDoc,
  type ControlStore,
  type Versioned,
  type WriterIdentity,
} from "./control";
import * as litestream from "./litestream.server";

export type Role = "starting" | "standby" | "claiming" | "writer" | "stopped";

const tickMs = 2_000;
const renewEveryMs = 10_000;
/** Fence this long before our lease could have expired in S3. */
const fenceMarginMs = 15_000;

function log(message: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: "info", component: "writer", message, ...extra }));
}
function warn(message: string, extra: Record<string, unknown> = {}) {
  console.error(JSON.stringify({ level: "error", component: "writer", message, ...extra }));
}

/** Identify this task from ECS task metadata, or env vars outside ECS. */
export async function resolveIdentity(): Promise<WriterIdentity> {
  const uri = process.env.ECS_CONTAINER_METADATA_URI_V4;
  if (uri) {
    const res = await fetch(`${uri}/task`);
    const task = (await res.json()) as { TaskARN: string; Family: string; Revision: string };
    return { taskArn: task.TaskARN, taskDefinition: `${task.Family}:${task.Revision}` };
  }
  return {
    taskArn: process.env.TASK_ID ?? `local-${process.pid}-${Date.now()}`,
    taskDefinition: process.env.TASK_DEFINITION ?? "local:1",
  };
}

export class WriterCoordinator {
  role: Role = "starting";
  lastError: string | null = null;
  lastSyncAt: Date | null = null;
  private control: Versioned<ControlDoc> | null = null;
  private replicator: litestream.Replicator | null = null;
  private leaseValidUntil = 0;
  private lastRenewAt = 0;
  private timer: NodeJS.Timeout | null = null;
  private busy = false;

  constructor(
    private readonly me: WriterIdentity,
    private readonly store: ControlStore,
    private readonly ls: litestream.LitestreamEnv,
    private readonly dataDir: string
  ) {}

  status() {
    const db = currentDatabase();
    return {
      role: this.role,
      writable: this.role === "writer" && db !== null && !db.readonly,
      dbReady: db !== null,
      epoch: this.control?.doc.epoch ?? null,
      generation: this.control?.doc.generation ?? null,
      state: this.control?.doc.state ?? null,
      taskArn: this.me.taskArn,
      taskDefinition: this.me.taskDefinition,
      lastSyncAt: this.lastSyncAt?.toISOString() ?? null,
      lastError: this.lastError,
    };
  }

  async start() {
    this.control = await readControl(this.store);
    await this.becomeStandby();
    this.timer = setInterval(() => void this.tick(), tickMs);
    await this.tick();
  }

  /** On SIGTERM: hand the database over cleanly, then stop. */
  async stop() {
    if (this.timer) clearInterval(this.timer);
    while (this.busy) await new Promise((r) => setTimeout(r, 100));
    if (this.role === "writer") await this.release("shutdown");
    this.role = "stopped";
  }

  private async tick() {
    if (this.busy || this.role === "stopped") return;
    this.busy = true;
    try {
      await this.step();
      this.lastError = null;
    } catch (e) {
      this.lastError = String(e);
      warn("coordinator step failed", { error: String(e) });
    } finally {
      this.busy = false;
    }
  }

  private async step() {
    const now = Date.now();
    if (this.role === "writer" && now > this.leaseValidUntil - fenceMarginMs) {
      warn("lease could not be renewed in time; fencing");
      await this.fence();
      return;
    }

    let current: Versioned<ControlDoc> | null;
    try {
      current = await readControl(this.store);
    } catch (e) {
      // Can't see S3: a writer keeps going until its lease margin runs out.
      throw new Error(`read control: ${e}`);
    }
    this.control = current;
    const doc = current?.doc ?? null;

    if (this.role === "writer") {
      if (!doc || doc.writer?.taskArn !== this.me.taskArn) {
        warn("control document names another writer; fencing", { writer: doc?.writer });
        await this.fence();
        return;
      }
      if (doc.state === "handoff") {
        await this.release(doc.handoff?.reason ?? "handoff");
        return;
      }
      await this.applyMaintenance(doc);
      if (now - this.lastRenewAt >= renewEveryMs) await this.renew(current!);
      return;
    }

    if (this.role === "standby" && mayClaim(doc, this.me, new Date())) {
      await this.claim(current);
    }
  }

  private async renew(current: Versioned<ControlDoc>) {
    const next = renewed(current.doc, this.me, new Date());
    if (!next) return;
    const written = await writeControl(this.store, next, current.etag);
    if (written) {
      this.control = written;
      this.lastRenewAt = Date.now();
      this.leaseValidUntil = this.lastRenewAt + leaseMs;
    }
    // On a conflict the next tick re-reads and reacts to whatever changed.
  }

  private async applyMaintenance(doc: ControlDoc) {
    const db = currentDatabase();
    if (!db) return;
    const wantReadonly = doc.state === "maintenance";
    if (db.readonly === wantReadonly) return;
    log(wantReadonly ? "entering maintenance (read-only)" : "leaving maintenance");
    setDatabase(openDatabase(db.path, { readonly: wantReadonly }));
  }

  private epochDir(epoch: number) {
    return path.join(this.dataDir, `epoch-${String(epoch).padStart(6, "0")}`);
  }

  /** Serve a read-only, migrated copy of the latest generation. */
  private async becomeStandby() {
    this.role = "standby";
    if (currentDatabase()) return; // keep serving what we have (e.g. after release)
    const doc = this.control?.doc;
    const file = path.join(this.dataDir, "standby", "app.db");
    const restoredAny =
      doc && doc.generation > 0 ? await litestream.restore(this.ls, doc.generation, file) : false;
    if (!restoredAny) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      for (const f of [file, `${file}-wal`, `${file}-shm`]) fs.rmSync(f, { force: true });
    }
    const rw = openDatabase(file);
    runMigrations(rw); // proves new migrations apply to current data
    rw.db.$client.close();
    setDatabase(openDatabase(file, { readonly: true }));
    log("standby ready", { generation: doc?.generation ?? 0, restored: restoredAny });
  }

  private async claim(current: Versioned<ControlDoc> | null) {
    const won = await writeControl(
      this.store,
      claimed(current?.doc ?? null, this.me, new Date()),
      current?.etag ?? null
    );
    if (!won) return;
    this.role = "claiming";
    this.control = won;
    const { epoch, generation } = won.doc;
    log("claimed database", { epoch, fromGeneration: generation });

    // Keep the lease alive while restoring a large database.
    let latest = won;
    const keepAlive = setInterval(async () => {
      const next = renewed(latest.doc, this.me, new Date());
      const w = next && (await writeControl(this.store, next, latest.etag).catch(() => null));
      if (w) latest = w;
    }, renewEveryMs);

    let handle: DbHandle | null = null;
    try {
      const file = path.join(this.epochDir(epoch), "app.db");
      const restoredAny =
        generation > 0 ? await litestream.restore(this.ls, generation, file) : false;
      if (!restoredAny && generation > 0) {
        throw new Error(`generation ${generation} has no backups; refusing to start empty`);
      }
      handle = openDatabase(file);
      assertIntegrity(handle);
      runMigrations(handle);

      const nextGeneration = generation + 1;
      await litestream.syncOnce(this.ls, file, nextGeneration, { forceSnapshot: true });

      clearInterval(keepAlive);
      const fresh = await readControl(this.store);
      const next = fresh && activated(fresh.doc, this.me, nextGeneration, new Date());
      const written = next && (await writeControl(this.store, next, fresh.etag));
      if (!written) throw new Error("lost the claim before activating");

      this.control = written;
      this.lastRenewAt = Date.now();
      this.leaseValidUntil = this.lastRenewAt + leaseMs;
      await recordGenerationStart(this.store, written.doc);
      this.replicator = litestream.replicate(this.ls, file, nextGeneration, (code) => {
        warn("litestream exited unexpectedly; fencing", { code });
        void this.fence();
      });
      const readonly = written.doc.state === "maintenance";
      if (readonly) {
        handle.db.$client.close();
        handle = openDatabase(file, { readonly: true });
      }
      setDatabase(handle);
      this.role = "writer";
      this.cleanupOldEpochs(epoch);
      log("now the writer", { epoch, generation: nextGeneration, readonly });
    } catch (e) {
      clearInterval(keepAlive);
      handle?.db.$client.close();
      warn("claim failed; staying standby (lease will expire)", { error: String(e) });
      this.role = "standby";
      throw e;
    }
  }

  /** Stop writing, flush the replica, and let someone else claim. */
  private async release(reason: string) {
    log("releasing writer role", { reason });
    await this.freeze();
    const fresh = await readControl(this.store);
    const next = fresh && released(fresh.doc, this.me, new Date());
    if (next) {
      const written = await writeControl(this.store, next, fresh.etag);
      if (written) this.control = written;
    }
    this.role = "standby";
    log("released");
  }

  /** Become read-only and stop replicating, without touching the control doc. */
  private async fence() {
    await this.freeze().catch((e) => warn("freeze failed", { error: String(e) }));
    this.role = "standby";
  }

  private async freeze() {
    const db = currentDatabase();
    if (db && !db.readonly) setDatabase(openDatabase(db.path, { readonly: true }));
    const replicator = this.replicator;
    this.replicator = null;
    await replicator?.stop();
    const generation = this.control?.doc.generation;
    if (db && generation) {
      // Belt and braces after litestream's own shutdown sync.
      await litestream.syncOnce(this.ls, db.path, generation);
    }
  }

  private cleanupOldEpochs(keep: number) {
    const keepName = path.basename(this.epochDir(keep));
    for (const name of fs.readdirSync(this.dataDir)) {
      if (name.startsWith("epoch-") && name !== keepName) {
        fs.rmSync(path.join(this.dataDir, name), { recursive: true, force: true });
      }
    }
  }
}

let coordinator: WriterCoordinator | null = null;

export function getCoordinator() {
  return coordinator;
}

/** Start coordination from env vars (see docker/README). */
export async function startCoordinatorFromEnv(): Promise<WriterCoordinator> {
  const bucket = process.env.REPLICA_BUCKET;
  if (!bucket) throw new Error("REPLICA_BUCKET is required when WRITER_COORDINATION=s3");
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
    heartbeatUrl: process.env.LITESTREAM_HEARTBEAT_URL,
  };
  const dataDir = process.env.DATA_DIR ?? "/data";
  fs.mkdirSync(dataDir, { recursive: true });
  coordinator = new WriterCoordinator(await resolveIdentity(), store, ls, dataDir);
  await coordinator.start();
  return coordinator;
}
