import fs from "node:fs/promises";
import path from "node:path";

import {
  AttachmentBuilder,
  ChannelType,
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

import { config } from "./config.js";
import { runResearchJob } from "./researchRunner.js";
import { findActiveSkill, loadActiveSkills } from "./skillWhitelist.js";

function buildCommandJson() {
  return [
    new SlashCommandBuilder()
      .setName("skills")
      .setDescription("List the currently active whitelisted research runtime skills.")
      .toJSON(),
    new SlashCommandBuilder()
      .setName("report")
      .setDescription("Run a whitelisted research runtime skill and post the generated report PNGs.")
      .addStringOption((option) =>
        option
          .setName("skill")
          .setDescription("Active skill name, for example druckenmiller-market-research")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("question")
          .setDescription("Question or research request")
          .setRequired(true)
          .setMaxLength(4000)
      )
      .toJSON()
  ];
}

async function registerSlashCommands() {
  const rest = new REST({ version: "10" }).setToken(config.discordToken);
  const route = config.guildId
    ? Routes.applicationGuildCommands(config.applicationId, config.guildId)
    : Routes.applicationCommands(config.applicationId);

  await rest.put(route, { body: buildCommandJson() });
}

function ensureAllowedUser(interaction) {
  if (config.allowedDiscordUserIds.length === 0) {
    return;
  }

  if (!config.allowedDiscordUserIds.includes(interaction.user.id)) {
    throw new Error("This bot is restricted to the configured Discord user allowlist.");
  }
}

async function loadAttachments(pngPaths) {
  return Promise.all(
    pngPaths.map(async (pngPath) => {
      const data = await fs.readFile(pngPath);
      return new AttachmentBuilder(data, { name: path.basename(pngPath) });
    })
  );
}

function summarizeProgress(eventProgress) {
  return [
    `status: ${eventProgress.status}`,
    eventProgress.threadId ? `thread: ${eventProgress.threadId}` : "",
    eventProgress.latestMessage
  ]
    .filter(Boolean)
    .join("\n");
}

function assertRunScopedAbsolutePath(runDir, filePath) {
  if (!path.isAbsolute(filePath)) {
    throw new Error(`Expected an absolute path, received: ${filePath}`);
  }

  const relative = path.relative(runDir, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Artifact path escaped the run directory: ${filePath}`);
  }
}

async function validateReportArtifacts(runDir, report) {
  const candidates = [report.html_path, ...report.png_paths, ...(report.supporting_paths || [])];

  for (const item of candidates) {
    assertRunScopedAbsolutePath(runDir, item);
    await fs.access(item);
  }
}

export async function startDiscordBot() {
  await fs.mkdir(config.runsDir, { recursive: true });
  await registerSlashCommands();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  client.once("clientReady", (readyClient) => {
    console.log(`Discord bot logged in as ${readyClient.user.tag}`);
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    try {
      ensureAllowedUser(interaction);

      if (
        interaction.channel &&
        interaction.channel.type !== ChannelType.GuildText &&
        interaction.channel.type !== ChannelType.PublicThread &&
        interaction.channel.type !== ChannelType.PrivateThread
      ) {
        throw new Error("This command only supports guild text channels and threads.");
      }

      if (interaction.commandName === "skills") {
        const activeSkills = await loadActiveSkills();
        const content = [
          "Active skills",
          ...activeSkills.map((skill) => `- ${skill.name}: ${skill.description}`)
        ].join("\n");
        await interaction.reply({ content, ephemeral: true });
        return;
      }

      if (interaction.commandName !== "report") {
        return;
      }

      const skillName = interaction.options.getString("skill", true);
      const question = interaction.options.getString("question", true).trim();
      const skill = await findActiveSkill(skillName);

      if (!skill) {
        const activeSkills = await loadActiveSkills();
        throw new Error(
          `Inactive or unknown skill: ${skillName}. Active skills: ${activeSkills.map((item) => item.name).join(", ")}`
        );
      }

      await interaction.deferReply();

      let lastProgressUpdate = 0;
      const job = await runResearchJob({
        skill,
        question,
        onEvent: async (progress) => {
          const now = Date.now();
          if (now - lastProgressUpdate < 5000) {
            return;
          }

          lastProgressUpdate = now;
          await interaction.editReply({
            content: `Running research runtime\n${summarizeProgress(progress)}`
          });
        }
      });

      if (job.code !== 0) {
        throw new Error(job.stderr || `research runtime exited with status ${job.code}`);
      }

      if (!job.result) {
        throw new Error("research runtime did not return a structured result.");
      }

      if (job.result.status !== "ok") {
        throw new Error(job.result.error || "research runtime reported an error.");
      }

      await validateReportArtifacts(job.runDir, job.result.report);

      const attachments = await loadAttachments(job.result.report.png_paths);
      const lines = [
        job.result.summary,
        "",
        `skill: ${skill.name}`,
        `run: ${job.runDir}`,
        `html: ${job.result.report.html_path}`
      ];

      if (Array.isArray(job.result.key_takeaways) && job.result.key_takeaways.length > 0) {
        lines.push("", "takeaways:");
        for (const takeaway of job.result.key_takeaways) {
          lines.push(`- ${takeaway}`);
        }
      }

      await interaction.editReply({
        content: lines.join("\n"),
        files: attachments
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `Failed\n${message}` });
        return;
      }

      await interaction.reply({ content: `Failed\n${message}`, ephemeral: true });
    }
  });

  await client.login(config.discordToken);
}
