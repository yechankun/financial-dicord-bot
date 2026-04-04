import { SlashCommandBuilder } from "discord.js";

import { addShareOption } from "./shared.js";

export function buildSkillsCommandJson() {
  return addShareOption(
    new SlashCommandBuilder()
      .setName("skills")
      .setDescription("지금 켜져 있는 스킬 목록을 보여준다냥."),
  ).toJSON();
}
