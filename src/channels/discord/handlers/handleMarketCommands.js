import {
  deleteEtfScreenPreferenceUsecase,
  loadEtfScreenPreferenceUsecase,
  runEtfLookup,
  runEtfScreen,
  runStockLookup,
  saveEtfScreenPreferenceUsecase,
} from "../../../usecases/marketCommands.js";
import {
  buildVisibilityReplyOptions,
  compactPreferenceJson,
} from "../responders/visibility.js";

export async function handleEtfScreenCommand(interaction) {
  const category = interaction.options.getString("category", true);
  const limit =
    interaction.options.getInteger("limit") ||
    (category === "overview" ? 2 : 5);
  const criteria =
    category === "overview" ? "" : interaction.options.getString("criteria") || "";

  await interaction.reply(
    buildVisibilityReplyOptions(
      interaction,
      await runEtfScreen({
        category,
        limit,
        criteria,
        discordUserId: interaction.user.id,
      }),
    ),
  );
}

export async function handleEtfScreenSaveCommand(interaction) {
  const category = interaction.options.getString("category", true);
  const criteria = interaction.options.getString("criteria", true).trim();
  const pref = await saveEtfScreenPreferenceUsecase({
    discordUserId: interaction.user.id,
    category,
    criteria,
  });
  await interaction.reply({
    content: [
      `저장 완료: \`${category}\``,
      `업데이트 시각: ${pref.updated_at}`,
      `criteria: \`${compactPreferenceJson(pref.criteria_json)}\``,
    ].join("\n"),
    flags: 64,
  });
}

export async function handleEtfScreenPrefCommand(interaction) {
  const action = interaction.options.getString("action", true);
  const category = interaction.options.getString("category", true);
  if (action === "show") {
    const pref = await loadEtfScreenPreferenceUsecase({
      discordUserId: interaction.user.id,
      category,
    });
    await interaction.reply({
      content: pref
        ? [
            `저장된 설정: \`${category}\``,
            `업데이트 시각: ${pref.updated_at}`,
            `criteria: \`${compactPreferenceJson(pref.criteria_json)}\``,
          ].join("\n")
        : `저장된 설정이 없다냥: \`${category}\``,
      flags: 64,
    });
    return;
  }

  const deleted = await deleteEtfScreenPreferenceUsecase({
    discordUserId: interaction.user.id,
    category,
  });
  await interaction.reply({
    content:
      deleted.deleted > 0
        ? `삭제 완료: \`${category}\``
        : `삭제할 설정이 없다냥: \`${category}\``,
    flags: 64,
  });
}

export async function handleEtfLookupCommand(interaction) {
  const symbol = interaction.options.getString("symbol", true);
  await interaction.reply(
    buildVisibilityReplyOptions(interaction, await runEtfLookup({ symbol })),
  );
}

export async function handleStockLookupCommand(interaction) {
  const symbol = interaction.options.getString("symbol", true);
  await interaction.reply(
    buildVisibilityReplyOptions(interaction, await runStockLookup({ symbol })),
  );
}
