import { buildBenchmarkViewMessage } from "../../../gateways/internal/benchmarkGateway.js";
import { buildVisibilityReplyOptions } from "../responders/visibility.js";

export async function handleBenchmarkCommand(interaction) {
  const view = interaction.options.getString("view", true);
  await interaction.reply(
    buildVisibilityReplyOptions(
      interaction,
      await buildBenchmarkViewMessage(view),
    ),
  );
}
