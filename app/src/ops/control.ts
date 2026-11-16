/**
 * The writer control document: the single source of truth for which process
 * may write the SQLite database, and which replica generation holds the
 * latest data. Shared by the app's writer coordinator, the ops CLI and the
 * blue/green hook Lambda in `infra/`, so it only depends on the S3 client.
 *
 * Stored at `s3://<bucket>/<prefix>control/writer.json` and only ever
 * changed with S3 conditional writes (If-Match / If-None-Match), so two
 * processes can never both believe they won a transition.
 *
 * Replica layout: `<prefix>db/gen-000042/` holds the Litestream replica of
 * generation 42. Every change of writer starts a new generation, so a stale
 * writer that somehow keeps running can never corrupt the active replica.
 *
 * State transitions:
 *
 *   (no document) ──claim──▶ claiming ──seeded──▶ active
 *   active ──requestHandoff──▶ handoff ──writer released──▶ released
 *   released ──claim──▶ claiming ──seeded──▶ active
 *   active (lease expired) ──claim──▶ claiming
 *   active ⇄ maintenance (writer stays owner but read-only)
 *
 * @module
 */

import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

export type WriterState = "claiming" | "active" | "handoff" | "released" | "maintenance";

export type WriterIdentity = {
  /** ECS task ARN (or a local id outside ECS). */
  taskArn: string;
  /** Task definition `family:revision`; ties tasks to a service revision. */
  taskDefinition: string;
};

export type ControlDoc = {
  version: 1;
  /** Increments on every change of owner. */
  epoch: number;
  /** Generation holding the latest complete data (restore from here). */
  generation: number;
  state: WriterState;
  writer: (WriterIdentity & { leaseExpiresAt: string }) | null;
  handoff: {
    requestedAt: string;
    reason: string;
    /** Only tasks of this task definition may claim, when set. */
    candidateTaskDefinition: string | null;
    /** Tasks that may not claim this handoff (the one releasing it). */
    excludeTaskArns: string[];
  } | null;
  maintenance: { reason: string; since: string } | null;
  updatedAt: string;
  updatedBy: string;
};

export type Versioned<T> = { doc: T; etag: string };

export type ControlStore = {
  client: S3Client;
  bucket: string;
  /** Key prefix, empty or ending in "/". */
  prefix: string;
};

export const leaseMs = 45_000;

export function controlKey(store: ControlStore) {
  return `${store.prefix}control/writer.json`;
}

export function generationPath(store: ControlStore, generation: number) {
  return `${store.prefix}db/gen-${String(generation).padStart(6, "0")}`;
}

export function createControlStore(opts: {
  bucket: string;
  prefix?: string;
  region?: string;
  endpoint?: string;
}): ControlStore {
  const prefix = opts.prefix ? opts.prefix.replace(/\/?$/, "/") : "";
  return {
    bucket: opts.bucket,
    prefix,
    client: new S3Client({
      region: opts.region,
      ...(opts.endpoint ? { endpoint: opts.endpoint, forcePathStyle: true } : {}),
    }),
  };
}

function isStatus(e: unknown, ...codes: number[]) {
  return e instanceof S3ServiceException && codes.includes(e.$metadata.httpStatusCode ?? 0);
}

export async function readControl(store: ControlStore): Promise<Versioned<ControlDoc> | null> {
  try {
    const res = await store.client.send(
      new GetObjectCommand({ Bucket: store.bucket, Key: controlKey(store) })
    );
    const body = await res.Body!.transformToString();
    return { doc: JSON.parse(body) as ControlDoc, etag: res.ETag! };
  } catch (e) {
    if (isStatus(e, 404) || (e as { name?: string }).name === "NoSuchKey") return null;
    throw e;
  }
}

/**
 * Write the document only if it is unchanged since `etag` was read (or does
 * not exist yet, when `etag` is null). Returns the new version, or null when
 * another process changed it first.
 */
export async function writeControl(
  store: ControlStore,
  doc: ControlDoc,
  etag: string | null
): Promise<Versioned<ControlDoc> | null> {
  try {
    const res = await store.client.send(
      new PutObjectCommand({
        Bucket: store.bucket,
        Key: controlKey(store),
        Body: JSON.stringify(doc, null, 2),
        ContentType: "application/json",
        ...(etag === null ? { IfNoneMatch: "*" } : { IfMatch: etag }),
      })
    );
    return { doc, etag: res.ETag! };
  } catch (e) {
    // 412: precondition failed; 409: concurrent conditional write.
    if (isStatus(e, 409, 412)) return null;
    throw e;
  }
}

/**
 * Read-modify-write with retries on conflicts. `change` returns the new
 * document, or null to leave it as is (e.g. the transition no longer
 * applies). Resolves to the stored version after the change, or null when
 * `change` declined.
 */
export async function updateControl(
  store: ControlStore,
  change: (current: ControlDoc | null) => ControlDoc | null,
  attempts = 5
): Promise<Versioned<ControlDoc> | null> {
  for (let i = 0; i < attempts; i++) {
    const current = await readControl(store);
    const next = change(current?.doc ?? null);
    if (!next) return null;
    const written = await writeControl(store, next, current?.etag ?? null);
    if (written) return written;
  }
  throw new Error("Control document kept changing; gave up after retries.");
}

/**
 * Record that `doc.generation` became live, under `control/history/`, so a
 * point-in-time restore can find which generation was live at a moment.
 * Called once per activation; idempotent.
 */
export async function recordGenerationStart(store: ControlStore, doc: ControlDoc) {
  const key = `${store.prefix}control/history/gen-${String(doc.generation).padStart(6, "0")}.json`;
  await store.client.send(
    new PutObjectCommand({
      Bucket: store.bucket,
      Key: key,
      Body: JSON.stringify({ generation: doc.generation, activeAt: doc.updatedAt, by: doc.updatedBy }),
      ContentType: "application/json",
      IfNoneMatch: "*",
    })
  ).catch((e) => {
    if (!isStatus(e, 409, 412)) throw e;
  });
}

export type GenerationStart = { generation: number; activeAt: string };

export async function listGenerations(store: ControlStore): Promise<GenerationStart[]> {
  const out: GenerationStart[] = [];
  let token: string | undefined;
  do {
    const res = await store.client.send(
      new ListObjectsV2Command({
        Bucket: store.bucket,
        Prefix: `${store.prefix}control/history/`,
        ContinuationToken: token,
      })
    );
    for (const obj of res.Contents ?? []) {
      const r = await store.client.send(
        new GetObjectCommand({ Bucket: store.bucket, Key: obj.Key! })
      );
      out.push(JSON.parse(await r.Body!.transformToString()) as GenerationStart);
    }
    token = res.NextContinuationToken;
  } while (token);
  return out.sort((a, b) => a.generation - b.generation);
}

/** The generation that was live at `at`: the newest one activated before it. */
export function generationAt(history: GenerationStart[], at: Date): number | null {
  let found: number | null = null;
  for (const g of history) if (new Date(g.activeAt) <= at) found = g.generation;
  return found;
}

// --- Pure transitions (unit-tested) -------------------------------------

const nowIso = (now: Date) => now.toISOString();

export function leaseExpired(doc: ControlDoc, now: Date, graceMs = 5_000): boolean {
  return !doc.writer || new Date(doc.writer.leaseExpiresAt).getTime() + graceMs < now.getTime();
}

/** Whether `me` may start claiming the database now. */
export function mayClaim(doc: ControlDoc | null, me: WriterIdentity, now: Date): boolean {
  if (!doc) return true;
  switch (doc.state) {
    case "released": {
      const h = doc.handoff;
      if (h?.excludeTaskArns.includes(me.taskArn)) return false;
      if (h?.candidateTaskDefinition && h.candidateTaskDefinition !== me.taskDefinition) {
        // A preferred candidate gets the first minute; then anyone may claim
        // so the service never stays read-only because that candidate died.
        return now.getTime() - new Date(h.requestedAt).getTime() > 60_000;
      }
      return true;
    }
    case "claiming":
    case "active":
    case "handoff":
    case "maintenance":
      // Includes our own expired lease: a writer that fenced itself (e.g.
      // S3 was briefly unreachable) reclaims by restoring from S3 again.
      return leaseExpired(doc, now);
  }
}

export function claimed(doc: ControlDoc | null, me: WriterIdentity, now: Date): ControlDoc {
  return {
    version: 1,
    epoch: (doc?.epoch ?? 0) + 1,
    generation: doc?.generation ?? 0,
    state: "claiming",
    writer: { ...me, leaseExpiresAt: new Date(now.getTime() + leaseMs).toISOString() },
    handoff: null,
    maintenance: doc?.maintenance ?? null,
    updatedAt: nowIso(now),
    updatedBy: me.taskArn,
  };
}

/** The claimer seeded `generation`; it is now the live one. */
export function activated(doc: ControlDoc, me: WriterIdentity, generation: number, now: Date) {
  if (doc.writer?.taskArn !== me.taskArn || doc.state !== "claiming") return null;
  return {
    ...doc,
    generation,
    state: doc.maintenance ? ("maintenance" as const) : ("active" as const),
    writer: { ...me, leaseExpiresAt: new Date(now.getTime() + leaseMs).toISOString() },
    updatedAt: nowIso(now),
    updatedBy: me.taskArn,
  };
}

export function renewed(doc: ControlDoc, me: WriterIdentity, now: Date): ControlDoc | null {
  if (doc.writer?.taskArn !== me.taskArn) return null;
  if (doc.state === "released") return null;
  return {
    ...doc,
    writer: { ...doc.writer, leaseExpiresAt: new Date(now.getTime() + leaseMs).toISOString() },
  };
}

export function handoffRequested(
  doc: ControlDoc,
  opts: { reason: string; candidateTaskDefinition?: string | null; by: string },
  now: Date
): ControlDoc | null {
  if (doc.state === "released" || doc.state === "handoff") {
    // Already handing off: just retarget the candidate.
    return doc.handoff
      ? {
          ...doc,
          handoff: { ...doc.handoff, candidateTaskDefinition: opts.candidateTaskDefinition ?? null },
          updatedAt: nowIso(now),
          updatedBy: opts.by,
        }
      : null;
  }
  return {
    ...doc,
    state: "handoff",
    handoff: {
      requestedAt: nowIso(now),
      reason: opts.reason,
      candidateTaskDefinition: opts.candidateTaskDefinition ?? null,
      excludeTaskArns: doc.writer ? [doc.writer.taskArn] : [],
    },
    updatedAt: nowIso(now),
    updatedBy: opts.by,
  };
}

/** The writer stopped writing and synced; anyone eligible may claim. */
export function released(doc: ControlDoc, me: WriterIdentity, now: Date): ControlDoc | null {
  if (doc.writer?.taskArn !== me.taskArn) return null;
  return {
    ...doc,
    state: "released",
    writer: null,
    handoff: doc.handoff ?? {
      requestedAt: nowIso(now),
      reason: "writer shutting down",
      candidateTaskDefinition: null,
      excludeTaskArns: [me.taskArn],
    },
    updatedAt: nowIso(now),
    updatedBy: me.taskArn,
  };
}

export function withMaintenance(
  doc: ControlDoc,
  maintenance: { reason: string } | null,
  by: string,
  now: Date
): ControlDoc {
  const state =
    doc.state === "active" && maintenance
      ? "maintenance"
      : doc.state === "maintenance" && !maintenance
        ? "active"
        : doc.state;
  return {
    ...doc,
    state,
    maintenance: maintenance ? { reason: maintenance.reason, since: nowIso(now) } : null,
    updatedAt: nowIso(now),
    updatedBy: by,
  };
}
