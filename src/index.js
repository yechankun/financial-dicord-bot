import { startDiscordBot } from "./discordBot.js";

startDiscordBot().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
