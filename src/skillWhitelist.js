import fs from "node:fs/promises";

import { config } from "./config.js";

function normalizeSkillName(input) {
  const trimmed = String(input || "").trim();
  return trimmed.startsWith("$") ? trimmed.slice(1) : trimmed;
}

function normalizeConfiguredSkill(rawSkill) {
  if (!rawSkill || typeof rawSkill !== "object") {
    throw new Error(`Invalid skill entry in ${config.skillsConfigPath}`);
  }

  const name = normalizeSkillName(String(rawSkill.name || "").trim());
  const mention = String(rawSkill.mention || "").trim();
  const description = String(rawSkill.description || "").trim();
  const enabled = rawSkill.enabled === true;

  if (!name) {
    throw new Error(`Every skill in ${config.skillsConfigPath} must include a name.`);
  }

  if (!mention) {
    throw new Error(`Skill ${name} is missing mention in ${config.skillsConfigPath}.`);
  }

  if (!description) {
    throw new Error(`Skill ${name} is missing description in ${config.skillsConfigPath}.`);
  }

  return {
    name,
    mention: mention.startsWith("$") ? mention : `$${name}`,
    description,
    enabled
  };
}

export async function loadConfiguredSkills() {
  const raw = await fs.readFile(config.skillsConfigPath, "utf8");
  const parsed = JSON.parse(raw);
  const configuredSkills = Array.isArray(parsed.skills) ? parsed.skills : [];
  const normalizedSkills = configuredSkills.map(normalizeConfiguredSkill);
  const names = new Set();

  for (const skill of normalizedSkills) {
    if (names.has(skill.name)) {
      throw new Error(`Duplicate skill name in ${config.skillsConfigPath}: ${skill.name}`);
    }
    names.add(skill.name);
  }

  if (normalizedSkills.length === 0) {
    throw new Error(`No skills configured in ${config.skillsConfigPath}.`);
  }

  return normalizedSkills;
}

export async function loadActiveSkills() {
  const configuredSkills = await loadConfiguredSkills();
  const activeSkills = configuredSkills.filter((skill) => skill.enabled);

  if (activeSkills.length === 0) {
    throw new Error(`No enabled skills configured in ${config.skillsConfigPath}.`);
  }

  return activeSkills;
}

export async function findActiveSkill(input) {
  const normalizedInput = normalizeSkillName(input);
  const activeSkills = await loadActiveSkills();
  return activeSkills.find((skill) => skill.name === normalizedInput) || null;
}
