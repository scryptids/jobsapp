/**
 * Production server: React Router behind Express, listening on loopback for
 * nginx. With `WRITER_COORDINATION=s3` it also runs the writer coordinator,
 * which owns the SQLite database and Litestream.
 *
 * Endpoints outside the app:
 *   GET /healthz  200 once a database is open (any role); ALB health check.
 *   GET /readyz   coordinator status JSON; used by deploy hooks and runbooks.
 *   GET /_internal/litestream-heartbeat  litestream sync heartbeat (loopback only).
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

import { createRequestHandler } from "@react-router/express";
import express from "express";

import { currentDatabase, getDb, isWritable } from "~/db/client.server";
import { getCoordinator, startCoordinatorFromEnv } from "~/ops/writer.server";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const buildDir = path.resolve(process.env.BUILD_DIR ?? "build");
const coordinated = process.env.WRITER_COORDINATION === "s3";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", "loopback");

app.get("/healthz", (_req, res) => {
  res.status(currentDatabase() ? 200 : 503).type("text").send(currentDatabase() ? "ok" : "starting");
});

app.get("/readyz", (_req, res) => {
  const status = getCoordinator()?.status() ?? {
    role: "standalone",
    writable: isWritable(),
    dbReady: currentDatabase() !== null,
  };
  res.status(status.dbReady ? 200 : 503).json(status);
});

// Litestream pings this (GET, roughly every 15s) after successful syncs.
app.all("/_internal/litestream-heartbeat", (req, res) => {
  const ip = req.socket.remoteAddress ?? "";
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip)) {
    res.sendStatus(403);
    return;
  }
  const c = getCoordinator();
  if (c) c.lastSyncAt = new Date();
  res.sendStatus(204);
});

// Write gate: while this task is a standby, frozen for a handoff, or in
// maintenance, refuse anything that could write. SQLite is also opened
// read-only in those states, so this is the friendly layer, not the only one.
app.use((req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  if (isWritable()) return next();
  res
    .status(503)
    .set("Retry-After", "5")
    .type("text")
    .send("The app is briefly read-only (deploy or maintenance). Please retry in a few seconds.");
});

// nginx serves /assets in the container; this covers running without it.
app.use(
  "/assets",
  express.static(path.join(buildDir, "client/assets"), { immutable: true, maxAge: "1y" })
);
app.use(express.static(path.join(buildDir, "client"), { maxAge: "1h" }));

app.all(
  "/{*splat}",
  createRequestHandler({
    build: () => import(pathToFileURL(path.join(buildDir, "server/index.js")).href),
    mode: process.env.NODE_ENV,
  })
);

const server = app.listen(port, host, () => {
  console.log(JSON.stringify({ level: "info", message: `listening on ${host}:${port}` }));
});

if (!coordinated) {
  // Standalone (local runs): open and migrate DATABASE_PATH up front.
  getDb();
} else {
  startCoordinatorFromEnv().catch((e) => {
    console.error(JSON.stringify({ level: "error", message: "coordinator failed to start", error: String(e) }));
    process.exit(1);
  });

  // CloudWatch Embedded Metric Format: one line per minute while writer.
  setInterval(() => {
    const c = getCoordinator();
    if (!c || c.role !== "writer") return;
    const lag = c.lastSyncAt ? (Date.now() - c.lastSyncAt.getTime()) / 1000 : 86400;
    console.log(
      JSON.stringify({
        _aws: {
          Timestamp: Date.now(),
          CloudWatchMetrics: [
            {
              Namespace: "Jobsapp",
              Dimensions: [[]],
              Metrics: [{ Name: "SecondsSinceReplicaSync", Unit: "Seconds" }],
            },
          ],
        },
        SecondsSinceReplicaSync: lag,
      })
    );
  }, 60_000).unref();
}

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(JSON.stringify({ level: "info", message: `${signal}: shutting down` }));
  server.close();
  try {
    await getCoordinator()?.stop();
  } catch (e) {
    console.error(JSON.stringify({ level: "error", message: "clean handoff failed", error: String(e) }));
  }
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
