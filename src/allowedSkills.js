export const USER_FACING_SKILLS = [
  {
    name: "druckenmiller-market-research",
    mention: "$druckenmiller-market-research",
    description: "Druckenmiller-style live market research with a 10-day basket conclusion."
  }
];

export const INTERNAL_SKILLS = [
  {
    name: "context-report-studio",
    mention: "$context-report-studio",
    description: "Render the final answer into HTML and PNG report pages."
  }
];

export function getUserFacingSkill(name) {
  return USER_FACING_SKILLS.find((skill) => skill.name === name);
}

export function normalizeSkillName(input) {
  const trimmed = input.trim();
  return trimmed.startsWith("$") ? trimmed.slice(1) : trimmed;
}
