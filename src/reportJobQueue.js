import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { config } from "./config.js";

const STALE_LOCK_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

function isStaleLock(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return true;
  }

  if (isProcessAlive(metadata.pid)) {
    return false;
  }

  const startedAt = Number(metadata.startedAt || 0);
  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    return true;
  }

  return Date.now() - startedAt > STALE_LOCK_MAX_AGE_MS;
}

async function readLockMetadata(lockDir) {
  try {
    const text = await fs.readFile(path.join(lockDir, "lock.json"), "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function writeLockMetadata(lockDir, metadata) {
  await fs.writeFile(
    path.join(lockDir, "lock.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
  );
}

async function acquireReportWorkerLock() {
  const lockDir = config.reportJobQueueLockDir;
  const metadata = {
    pid: process.pid,
    startedAt: Date.now(),
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await fs.mkdir(lockDir);
      await writeLockMetadata(lockDir, metadata);
      return {
        acquired: true,
        async release() {
          await fs.rm(lockDir, { recursive: true, force: true });
        },
      };
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }

      const existing = await readLockMetadata(lockDir);
      if (isStaleLock(existing)) {
        await fs.rm(lockDir, { recursive: true, force: true });
        continue;
      }

      return {
        acquired: false,
        async release() {},
      };
    }
  }

  return {
    acquired: false,
    async release() {},
  };
}

export async function ensureReportJobQueueDirs() {
  await fs.mkdir(config.reportJobQueuePendingDir, { recursive: true });
  await fs.mkdir(config.reportJobQueueProcessingDir, { recursive: true });
  await fs.mkdir(config.reportJobQueueProcessedDir, { recursive: true });
}

async function reclaimProcessingItems() {
  const entries = await fs
    .readdir(config.reportJobQueueProcessingDir, { withFileTypes: true })
    .catch(() => []);

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) =>
        fs
          .rename(
            path.join(config.reportJobQueueProcessingDir, entry.name),
            path.join(config.reportJobQueuePendingDir, entry.name),
          )
          .catch(() => {}),
      ),
  );
}

export async function enqueueReportJob(item) {
  await ensureReportJobQueueDirs();
  const queueId = `${Date.now()}-${randomUUID()}`;
  const filePath = path.join(config.reportJobQueuePendingDir, `${queueId}.json`);
  const payload = {
    queueId,
    enqueuedAt: new Date().toISOString(),
    ...item,
  };
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

async function claimPendingBatch() {
  const entries = await fs
    .readdir(config.reportJobQueuePendingDir, { withFileTypes: true })
    .catch(() => []);
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  const batch = [];

  for (const filename of files) {
    const pendingPath = path.join(config.reportJobQueuePendingDir, filename);
    const processingPath = path.join(
      config.reportJobQueueProcessingDir,
      filename,
    );

    try {
      await fs.rename(pendingPath, processingPath);
      const raw = await fs.readFile(processingPath, "utf8");
      batch.push({
        filePath: processingPath,
        payload: JSON.parse(raw),
      });
    } catch {
      continue;
    }
  }

  return batch;
}

async function markBatchProcessed(batch) {
  await Promise.all(
    batch.map((item) =>
      fs
        .rename(
          item.filePath,
          path.join(config.reportJobQueueProcessedDir, path.basename(item.filePath)),
        )
        .catch(() => fs.rm(item.filePath, { force: true }).catch(() => {})),
    ),
  );
}

export async function writeReportJobResult(queueId, result) {
  await ensureReportJobQueueDirs();
  await fs.writeFile(
    path.join(config.reportJobQueueProcessedDir, `${queueId}.result.json`),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8",
  );
}

export async function drainReportJobQueue(consumeBatch) {
  await ensureReportJobQueueDirs();
  const lock = await acquireReportWorkerLock();
  if (!lock.acquired) {
    return false;
  }

  try {
    await reclaimProcessingItems();

    while (true) {
      const batch = await claimPendingBatch();
      if (batch.length === 0) {
        break;
      }

      await consumeBatch(batch.map((item) => item.payload));
      await markBatchProcessed(batch);
    }

    return true;
  } finally {
    await lock.release();
  }
}

export async function waitForReportJobResult(
  queueId,
  timeoutMs = 15 * 60 * 1000,
) {
  const filename = `${queueId}.json`;
  const resultPath = path.join(
    config.reportJobQueueProcessedDir,
    `${queueId}.result.json`,
  );
  const pendingPath = path.join(config.reportJobQueuePendingDir, filename);
  const processingPath = path.join(config.reportJobQueueProcessingDir, filename);
  const processedPath = path.join(config.reportJobQueueProcessedDir, filename);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = await fs
      .readFile(resultPath, "utf8")
      .then((raw) => JSON.parse(raw))
      .catch(() => null);

    if (result) {
      return result;
    }

    const [pending, processing, processed] = await Promise.all([
      fs.access(pendingPath).then(() => true).catch(() => false),
      fs.access(processingPath).then(() => true).catch(() => false),
      fs.access(processedPath).then(() => true).catch(() => false),
    ]);

    if (!pending && !processing && !processed) {
      return null;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return null;
}
