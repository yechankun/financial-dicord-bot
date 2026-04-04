import { ChannelType, MessageFlags } from "discord.js";

import { config } from "../../../config.js";
import {
  getInternalUnavailableMessage,
  hasInternalProvider,
} from "../../../gateways/internal/provider.js";
import { handleBenchmarkCommand } from "./handleBenchmarkCommand.js";
import {
  handleEtfLookupCommand,
  handleEtfScreenCommand,
  handleEtfScreenPrefCommand,
  handleEtfScreenSaveCommand,
  handleStockLookupCommand,
} from "./handleMarketCommands.js";
import { handleReportCommand } from "./handleReportCommand.js";
import { handleSkillsCommand } from "./handleSkillsCommand.js";

function ensureAllowedUser(interaction) {
  if (config.allowedDiscordUserIds.length === 0) {
    return;
  }

  if (!config.allowedDiscordUserIds.includes(interaction.user.id)) {
    throw new Error("이 봇은 허용된 사용자만 쓸 수 있다냥.");
  }
}

function isGuildTextLikeChannel(channel) {
  return (
    channel &&
    (channel.type === ChannelType.GuildText ||
      channel.type === ChannelType.PublicThread ||
      channel.type === ChannelType.PrivateThread)
  );
}

function requiresInternalProvider(commandName) {
  return commandName !== "skills";
}

export function createChatCommandHandler({
  activeChannelRuns,
  consumeChartQueueBatch,
  consumeBenchmarkQueueBatch,
}) {
  return async function handleChatInputCommand(interaction) {
    const channelKey = interaction.channelId || "unknown-channel";
    const existingRun = activeChannelRuns.get(channelKey);
    if (existingRun) {
      const message = `이 채널에서는 이미 \`/${existingRun.commandName}\` 실행이 돌아가고 있다냥. 끝난 뒤에 다시 시도해달라냥.`;
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: message }).catch(() => {});
        return;
      }

      await interaction
        .reply({ content: message, flags: MessageFlags.Ephemeral })
        .catch(() => {});
      return;
    }

    try {
      ensureAllowedUser(interaction);

      if (!isGuildTextLikeChannel(interaction.channel)) {
        throw new Error("이 명령은 서버 텍스트 채널에서만 쓸 수 있다냥.");
      }

      if (
        requiresInternalProvider(interaction.commandName) &&
        !hasInternalProvider()
      ) {
        await interaction.reply({
          content: getInternalUnavailableMessage(),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (interaction.commandName === "skills") {
        await handleSkillsCommand(interaction);
        return;
      }

      if (interaction.commandName === "benchmark") {
        await handleBenchmarkCommand(interaction);
        return;
      }

      if (interaction.commandName === "etfscreen") {
        await handleEtfScreenCommand(interaction);
        return;
      }

      if (interaction.commandName === "etfscreen-save") {
        await handleEtfScreenSaveCommand(interaction);
        return;
      }

      if (interaction.commandName === "etfscreen-pref") {
        await handleEtfScreenPrefCommand(interaction);
        return;
      }

      if (interaction.commandName === "etf") {
        await handleEtfLookupCommand(interaction);
        return;
      }

      if (interaction.commandName === "stock") {
        await handleStockLookupCommand(interaction);
        return;
      }

      if (interaction.commandName === "report") {
        await handleReportCommand({
          interaction,
          channelKey,
          activeChannelRuns,
          consumeChartQueueBatch,
          consumeBenchmarkQueueBatch,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "요청 처리 중 문제가 생겼다냥.";
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: message }).catch(() => {});
        return;
      }

      await interaction.reply({
        content: message,
        flags: MessageFlags.Ephemeral,
      });
    }
  };
}
