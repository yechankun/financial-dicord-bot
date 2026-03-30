import "dotenv/config";
import path from "node:path";

const cwd = process.cwd();

function readRequired(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readOptionalList(name) {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  discordToken: readRequired("DISCORD_BOT_TOKEN"),
  applicationId: readRequired("DISCORD_APPLICATION_ID"),
  guildId: process.env.DISCORD_GUILD_ID?.trim() || "",
  allowedDiscordUserIds: readOptionalList("ALLOWED_DISCORD_USER_IDS"),
  workspaceDir: cwd,
  runsDir: path.join(cwd, "runs"),
  schemaPath: path.join(cwd, "schemas", "report-output.schema.json"),
  activeSkillsPath: path.join(cwd, "config", "active-skills.json")
};
