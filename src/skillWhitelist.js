import fs from "node:fs/promises";

import { USER_FACING_SKILLS, getUserFacingSkill, normalizeSkillName } from "./allowedSkills.js";
import { config } from "./config.js";

function unique(items) {
  return [...new Set(items)];
}

export async function loadActiveSkills() {
  const raw = await fs.readFile(config.activeSkillsPath, "utf8");
  const parsed = JSON.parse(raw);
  const configuredNames = Array.isArray(parsed.user_facing_skills) ? parsed.user_facing_skills : [];
  const normalizedNames = unique(configuredNames.map((name) => normalizeSkillName(String(name))));
  const activeSkills = normalizedNames.map((name) => {
    const skill = getUserFacingSkill(name);
    if (!skill) {
      throw new Error(`Unknown skill in whitelist file: ${name}`);
    }

    return skill;
  });

  if (activeSkills.length === 0) {
    throw new Error(
      `No active user-facing skills configured in ${config.activeSkillsPath}. Known skills: ${USER_FACING_SKILLS.map((skill) => skill.name).join(", ")}`
    );
  }

  return activeSkills;
}

export async function findActiveSkill(input) {
  const normalizedInput = normalizeSkillName(input);
  const activeSkills = await loadActiveSkills();
  return activeSkills.find((skill) => skill.name === normalizedInput) || null;
}
