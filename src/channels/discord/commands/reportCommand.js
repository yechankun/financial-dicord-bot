import { SlashCommandBuilder } from "discord.js";

export function buildReportCommandJson(activeSkills) {
  return new SlashCommandBuilder()
    .setName("report")
    .setDescription("활성화된 스킬로 리포트를 만들어 올린다냥.")
    .addStringOption((option) => {
      option
        .setName("skill")
        .setDescription("실행할 활성 스킬을 골라달라냥.")
        .setRequired(true);

      for (const skill of activeSkills.slice(0, 25)) {
        option.addChoices({
          name: skill.name,
          value: skill.name,
        });
      }

      return option;
    })
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("리서치 요청 내용이다냥.")
        .setRequired(true)
        .setMaxLength(4000),
    )
    .toJSON();
}
