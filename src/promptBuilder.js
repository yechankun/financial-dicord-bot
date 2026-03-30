import path from "node:path";

import { INTERNAL_SKILLS } from "./allowedSkills.js";

export function buildResearchPrompt({ skill, question, runDir }) {
  const outputDir = path.join(runDir, "report");
  const internalSkills = INTERNAL_SKILLS.map((item) => item.mention).join("\n");

  return [
    "You are running inside a Discord bot automation flow.",
    "Only use the explicitly enabled skills listed below.",
    "",
    "Enabled user skill:",
    skill.mention,
    "",
    "Enabled internal post-processing skill:",
    internalSkills,
    "",
    "Task:",
    question.trim(),
    "",
    "Execution requirements:",
    `1. Treat ${skill.mention} as the primary analysis workflow.`,
    `2. After the analysis, use ${INTERNAL_SKILLS[0].mention} to create a polished local report bundle in ${outputDir}.`,
    "3. The report bundle must include one HTML file and at least one PNG page export.",
    "4. Use absolute filesystem paths in the final response.",
    "5. If intermediate markdown or chart assets are created, keep them under the same run directory.",
    "6. Do not ask follow-up questions. Make reasonable assumptions and proceed.",
    "7. This service is for informational market research only. It must not be framed as investment solicitation, personalized investment advice, discretionary management, or a recommendation to enter a financial product contract.",
    "8. Do not tailor the report to the user's holdings, entry price, risk profile, target return, or personal circumstances.",
    "9. When writing the final report with $context-report-studio, add a visible Korean disclaimer on page 1: 본 자료는 정보 제공용 리서치입니다. 투자 권유 또는 투자자문이 아니며, 이용자의 개별 사정을 반영하지 않습니다. 투자 판단과 책임은 이용자 본인에게 있습니다.",
    "10. Avoid direct imperative trading language such as buy now, sell now, target price, guaranteed return, or personalized portfolio instructions.",
    "11. If the source skill uses terms like add, trim, exit, basket, or capital allocation, rewrite them as non-personal scenario labels such as additional confirmation, overheating warning, invalidation trigger, candidate set, and relative priority map.",
    "12. Keep the analysis general, public-data-based, and scenario-oriented.",
    "",
    "Final response requirements:",
    "Return JSON only.",
    "The JSON must satisfy the provided output schema.",
    "Always populate key_takeaways, report.supporting_paths, notes, and error.",
    "Use error: null when the run succeeds.",
    "Set status to error if report generation fails.",
    "If status is error, still provide the best summary you can and populate error with the failure reason."
  ].join("\n");
}
