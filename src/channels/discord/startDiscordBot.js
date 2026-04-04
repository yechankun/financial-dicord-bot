import fs from "node:fs/promises";

import { Client, GatewayIntentBits } from "discord.js";

import { config } from "../../config.js";
import {
  createBenchmarkQueueConsumer,
  drainPendingBenchmarkQueue,
  ensureBenchmarkRuntime,
} from "../../gateways/internal/benchmarkGateway.js";
import {
  createChartQueueConsumer,
  drainPendingChartQueue,
  ensureChartRuntime,
} from "../../gateways/internal/chartGateway.js";
import {
  getInternalProviderStatus,
  hasInternalProvider,
} from "../../gateways/internal/provider.js";
import { registerSlashCommands } from "./commands/registerSlashCommands.js";
import { createInteractionHandler } from "./handlers/createInteractionHandler.js";

export async function startDiscordBot() {
  const internalAvailable = hasInternalProvider();
  const providerStatus = getInternalProviderStatus();

  await fs.mkdir(config.runsDir, { recursive: true });
  await fs.mkdir(config.channelLocksDir, { recursive: true });
  if (internalAvailable) {
    await ensureBenchmarkRuntime();
    await ensureChartRuntime();
  }
  await registerSlashCommands({ internalCommandsEnabled: internalAvailable });

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  const activeChannelRuns = new Map();
  const consumeBenchmarkQueueBatch = internalAvailable
    ? createBenchmarkQueueConsumer(client)
    : async () => {};
  const consumeChartQueueBatch = internalAvailable
    ? createChartQueueConsumer()
    : async () => {};
  const handleInteraction = createInteractionHandler({
    activeChannelRuns,
    consumeChartQueueBatch,
    consumeBenchmarkQueueBatch,
  });

  client.once("clientReady", (readyClient) => {
    console.log(`Discord bot logged in as ${readyClient.user.tag}`);
    if (!internalAvailable) {
      console.warn(
        `Internal provider unavailable. requested=${providerStatus.requestedMode} resolved=${providerStatus.resolvedMode} error=${providerStatus.error || "none"}`,
      );
      return;
    }

    void drainPendingChartQueue(consumeChartQueueBatch).catch((error) => {
      console.error("Failed to drain chart queue on startup:", error);
    });
    void drainPendingBenchmarkQueue(consumeBenchmarkQueueBatch).catch((error) => {
      console.error("Failed to drain benchmark queue on startup:", error);
    });
  });

  client.on("interactionCreate", handleInteraction);
  await client.login(config.discordToken);
}
