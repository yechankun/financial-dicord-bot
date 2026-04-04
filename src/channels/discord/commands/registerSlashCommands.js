import { REST, Routes } from "discord.js";

import { config } from "../../../config.js";
import {
  canHandleLookupCommands,
  canHandleReportCommands,
} from "../../../runtimeCapabilities.js";
import { loadActiveSkills } from "../../../skillWhitelist.js";
import { buildBenchmarkCommandJson } from "./benchmarkCommand.js";
import {
  buildEtfLookupCommandJson,
  buildEtfScreenCommandJson,
  buildEtfScreenPrefCommandJson,
  buildEtfScreenSaveCommandJson,
  buildStockScreenCommandJson,
  buildStockLookupCommandJson,
} from "./marketCommands.js";
import { buildReportCommandJson } from "./reportCommand.js";
import { buildSkillsCommandJson } from "./skillsCommand.js";

export function buildCommandJson(activeSkills, { internalCommandsEnabled }) {
  const commands = [buildSkillsCommandJson()];

  if (!internalCommandsEnabled) {
    return commands;
  }

  if (canHandleLookupCommands()) {
    commands.push(
      buildEtfScreenCommandJson(),
      buildEtfScreenSaveCommandJson(),
      buildEtfScreenPrefCommandJson(),
      buildEtfLookupCommandJson(),
      buildStockScreenCommandJson(),
      buildStockLookupCommandJson(),
      buildBenchmarkCommandJson(),
    );
  }

  if (canHandleReportCommands()) {
    commands.push(buildReportCommandJson(activeSkills));
  }

  return commands;
}

export async function registerSlashCommands({ internalCommandsEnabled = true } = {}) {
  const activeSkills = internalCommandsEnabled ? await loadActiveSkills() : [];
  const rest = new REST({ version: "10" }).setToken(config.discordToken);
  const route = config.guildId
    ? Routes.applicationGuildCommands(config.applicationId, config.guildId)
    : Routes.applicationCommands(config.applicationId);

  await rest.put(route, {
    body: buildCommandJson(activeSkills, { internalCommandsEnabled }),
  });
}
