import { startDiscordBot } from "./discordBot.js";
import {
  createBenchmarkQueueConsumer,
  drainPendingBenchmarkQueue,
  ensureBenchmarkRuntime,
} from "./gateways/internal/benchmarkGateway.js";
import {
  createChartQueueConsumer,
  drainPendingChartQueue,
  ensureChartRuntime,
} from "./gateways/internal/chartGateway.js";
import {
  getInternalProviderStatus,
  hasInternalProvider,
} from "./gateways/internal/provider.js";
import {
  getCapabilityStatus,
  hasCapability,
  shouldStartDiscordIngress,
} from "./runtimeCapabilities.js";

function logCapabilityStatus() {
  const status = getCapabilityStatus();
  console.log(
    `Runtime capabilities: ${status.capabilities.join(", ") || "(none)"}`,
  );
}

export async function startRuntime() {
  logCapabilityStatus();

  if (shouldStartDiscordIngress()) {
    await startDiscordBot();
    return;
  }

  const providerStatus = getInternalProviderStatus();
  if (!hasInternalProvider()) {
    console.warn(
      `Internal provider unavailable for background runtime. requested=${providerStatus.requestedMode} resolved=${providerStatus.resolvedMode} error=${providerStatus.error || "none"}`,
    );
    return;
  }

  const chartWorkerEnabled = hasCapability("report-worker");
  const benchmarkWorkerEnabled = hasCapability("ai-trading");
  const collectorEnabled = hasCapability("collector");

  if (!chartWorkerEnabled && !benchmarkWorkerEnabled && !collectorEnabled) {
    console.log("No background capabilities enabled. Exiting runtime.");
    return;
  }

  if (chartWorkerEnabled) {
    await ensureChartRuntime();
  }
  if (benchmarkWorkerEnabled) {
    await ensureBenchmarkRuntime();
  }

  if (collectorEnabled) {
    console.log(
      "collector capability is enabled, but collector loop is not wired yet.",
    );
  }

  const consumeChartQueueBatch = chartWorkerEnabled
    ? createChartQueueConsumer()
    : async () => {};
  const consumeBenchmarkQueueBatch = benchmarkWorkerEnabled
    ? createBenchmarkQueueConsumer()
    : async () => {};

  const drainQueues = async () => {
    if (chartWorkerEnabled) {
      await drainPendingChartQueue(consumeChartQueueBatch);
    }
    if (benchmarkWorkerEnabled) {
      await drainPendingBenchmarkQueue(consumeBenchmarkQueueBatch);
    }
  };

  await drainQueues();

  const pollIntervalMs = Number(process.env.BACKGROUND_POLL_INTERVAL_MS || 5000);
  const timer = setInterval(() => {
    void drainQueues().catch((error) => {
      console.error("Background runtime queue drain failed:", error);
    });
  }, pollIntervalMs);

  console.log(
    `Background runtime started with poll interval ${pollIntervalMs}ms.`,
  );

  await new Promise((resolve) => {
    const shutdown = () => {
      clearInterval(timer);
      resolve();
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  });
}
