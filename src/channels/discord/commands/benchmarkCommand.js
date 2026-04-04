import { SlashCommandBuilder } from "discord.js";

import { addShareOption } from "./shared.js";

export function buildBenchmarkCommandJson() {
  return addShareOption(
    new SlashCommandBuilder()
      .setName("benchmark")
      .setDescription("벤치마크 시뮬레이션 상태를 보여준다냥.")
      .addStringOption((option) =>
        option
          .setName("view")
          .setDescription("보고 싶은 벤치마크 정보를 골라달라냥.")
          .setRequired(true)
          .addChoices(
            { name: "portfolio", value: "portfolio" },
            { name: "history", value: "history" },
          ),
      ),
  ).toJSON();
}
