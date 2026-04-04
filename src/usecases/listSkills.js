import { loadActiveSkills } from "../skillWhitelist.js";

export async function buildSkillsMessage() {
  const activeSkills = await loadActiveSkills();
  return [
    "지금 켜져 있는 스킬 목록이다냥.",
    ...activeSkills.map((skill) => `- ${skill.name}: ${skill.description}`),
  ].join("\n");
}
