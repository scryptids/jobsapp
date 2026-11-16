/**
 * Thin wrapper over the `litestream` binary (0.5.x). Each generation gets
 * its own config file pointing one database file at one replica path.
 * @module
 */

import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { generationPath, type ControlStore } from "./control";

export type LitestreamEnv = {
  bin: string;
  store: ControlStore;
  region?: string;
  /** S3-compatible endpoint for local testing (LocalStack). */
  endpoint?: string;
  /** Where litestream POSTs after successful syncs, if set. */
  heartbeatUrl?: string;
};

/** Write a config replicating `dbPath` to `generation`; returns its path. */
export function writeConfig(env: LitestreamEnv, dbPath: string, generation: number): string {
  const replica = [
    `      type: s3`,
    `      bucket: ${JSON.stringify(env.store.bucket)}`,
    `      path: ${JSON.stringify(generationPath(env.store, generation))}`,
    env.region ? `      region: ${JSON.stringify(env.region)}` : null,
    env.endpoint ? `      endpoint: ${JSON.stringify(env.endpoint)}` : null,
    env.endpoint ? `      force-path-style: true` : null,
    `      sync-interval: 1s`,
  ].filter(Boolean);
  const yaml = [
    env.heartbeatUrl ? `heartbeat-url: ${JSON.stringify(env.heartbeatUrl)}` : null,
    `shutdown-sync-timeout: 30s`,
    `dbs:`,
    `  - path: ${JSON.stringify(dbPath)}`,
    `    busy-timeout: 5s`,
    `    snapshot:`,
    `      interval: 24h`,
    `      retention: 720h`,
    `    replica:`,
    ...replica,
    "",
  ]
    .filter((l) => l !== null)
    .join("\n");
  const file = `${dbPath}.litestream.yml`;
  fs.writeFileSync(file, yaml, { mode: 0o600 });
  return file;
}

function run(env: LitestreamEnv, args: string[], timeoutMs = 10 * 60_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(env.bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(`litestream ${args[0]} exited ${code}: ${out.trim().slice(-2000)}`));
    });
  });
}

/**
 * Restore `generation` (optionally as of `timestamp`) into `outPath`.
 * Resolves false when the generation has no backups yet.
 */
export async function restore(
  env: LitestreamEnv,
  generation: number,
  outPath: string,
  opts: { timestamp?: Date } = {}
): Promise<boolean> {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  for (const f of [outPath, `${outPath}-wal`, `${outPath}-shm`]) fs.rmSync(f, { force: true });
  const config = writeConfig(env, outPath, generation);
  await run(env, [
    "restore",
    "-config",
    config,
    "-if-replica-exists",
    "-integrity-check",
    "quick",
    ...(opts.timestamp ? ["-timestamp", opts.timestamp.toISOString()] : []),
    "-o",
    outPath,
    outPath,
  ]);
  return fs.existsSync(outPath);
}

/** Sync everything once (with a fresh snapshot) and exit. */
export async function syncOnce(
  env: LitestreamEnv,
  dbPath: string,
  generation: number,
  { forceSnapshot = false } = {}
): Promise<void> {
  const config = writeConfig(env, dbPath, generation);
  await run(env, [
    "replicate",
    "-config",
    config,
    "-once",
    ...(forceSnapshot ? ["-force-snapshot"] : []),
  ]);
}

export type Replicator = {
  /** Stop replicating; litestream does a final sync on SIGTERM. */
  stop(): Promise<void>;
  readonly child: ChildProcess;
};

/** Start continuous replication. `onExit` fires if it dies unexpectedly. */
export function replicate(
  env: LitestreamEnv,
  dbPath: string,
  generation: number,
  onExit: (code: number | null) => void
): Replicator {
  const config = writeConfig(env, dbPath, generation);
  const child = spawn(env.bin, ["replicate", "-config", config], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  let stopping = false;
  child.on("exit", (code) => {
    if (!stopping) onExit(code);
  });
  return {
    child,
    stop() {
      stopping = true;
      if (child.exitCode !== null) return Promise.resolve();
      return new Promise((resolve) => {
        const timer = setTimeout(() => child.kill("SIGKILL"), 45_000);
        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
        child.kill("SIGTERM");
      });
    },
  };
}
