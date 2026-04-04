import { fetchSymbolAutocomplete } from "../../../gateways/internal/marketGateway.js";

export async function handleAutocompleteInteraction(interaction) {
  try {
    if (interaction.commandName === "etf") {
      const focused = interaction.options.getFocused(true);
      const choices = await fetchSymbolAutocomplete({
        dataset: "etf",
        query: focused.value,
      });
      await interaction.respond(choices);
      return;
    }

    if (interaction.commandName === "stock") {
      const focused = interaction.options.getFocused(true);
      const choices = await fetchSymbolAutocomplete({
        dataset: "stock",
        query: focused.value,
      });
      await interaction.respond(choices);
      return;
    }

    await interaction.respond([]);
  } catch (error) {
    console.error("Failed to respond to autocomplete interaction:", error);
    await interaction.respond([]).catch(() => {});
  }
}
