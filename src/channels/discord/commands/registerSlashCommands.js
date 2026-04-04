import { REST, Routes } from "discord.js";

import { config } from "../../../config.js";
import { loadActiveSkills } from "../../../skillWhitelist.js";
import { buildBenchmarkCommandJson } from "./benchmarkCommand.js";
import {
  buildEtfLookupCommandJson,
  buildEtfScreenCommandJson,
  buildEtfScreenPrefCommandJson,
  buildEtfScreenSaveCommandJson,
  buildStockLookupCommandJson,
} from "./marketCommands.js";
import { buildReportCommandJson } from "./reportCommand.js";
import { buildSkillsCommandJson } from "./skillsCommand.js";

export function buildCommandJson(activeSkills, { internalCommandsEnabled }) {
  const commands = [buildSkillsCommandJson()];

  if (!internalCommandsEnabled) {
    return commands;
  }

  return commands.concat([
    buildEtfScreenCommandJson(),
    buildEtfScreenSaveCommandJson(),
    buildEtfScreenPrefCommandJson(),
    buildEtfLookupCommandJson(),
    buildStockLookupCommandJson(),
    buildReportCommandJson(activeSkills),
    buildBenchmarkCommandJson(),
  ]);
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
