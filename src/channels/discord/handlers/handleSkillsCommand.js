import { buildSkillsMessage } from "../../../usecases/listSkills.js";
import { buildVisibilityReplyOptions } from "../responders/visibility.js";

export async function handleSkillsCommand(interaction) {
  await interaction.reply(
    buildVisibilityReplyOptions(interaction, await buildSkillsMessage()),
  );
}
