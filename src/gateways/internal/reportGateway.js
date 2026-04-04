import path from "node:path";

import { config } from "../../config.js";
import { internalPrompts, internalResearch } from "./provider.js";

const PRODUCER_PROMPT_BUILDERS = {
  "policy-search": internalPrompts.buildPolicySearchPrompt,
  "tech-social-search": internalPrompts.buildTechSocialSearchPrompt,
  "scan-producer": internalPrompts.buildScanProducerPrompt,
};

export function createReportRun(skillName) {
  const runId = internalResearch.createRunId(skillName);
  return {
    runId,
    runDir: path.join(config.runsDir, runId),
  };
}

export async function runGuardStage({ skill, question, runDir }) {
  return internalResearch.runResearchJob({
    prompt: internalPrompts.buildGuardPrompt({ skill, question }),
    schemaPath: config.guardSchemaPath,
    runDir,
    stageName: "guard",
    sandboxMode: "read-only",
  });
}

export async function runProducerStage({
  stageName,
  skill,
  question,
  artifactPaths,
  runDir,
  onEvent,
}) {
  const buildPrompt = PRODUCER_PROMPT_BUILDERS[stageName];
  if (!buildPrompt) {
    throw new Error(`Unknown producer stage: ${stageName}`);
  }

  return internalResearch.runResearchJob({
    prompt: buildPrompt({
      skill,
      question,
      artifactPaths,
    }),
    schemaPath: config.producerSchemaPath,
    runDir,
    stageName,
    onEvent,
  });
}

export async function runResearchStage({
  skill,
  question,
  runDir,
  artifactPaths,
  benchmarkContext,
  onEvent,
}) {
  return internalResearch.runResearchJob({
    prompt: internalPrompts.buildResearchPrompt({
      skill,
      question,
      runDir,
      benchmarkContext,
      artifactPaths,
    }),
    schemaPath: config.researchSchemaPath,
    runDir,
    stageName: "research",
    onEvent,
  });
}

export async function runReportStage({
  skill,
  analysisMarkdown,
  runDir,
  onEvent,
}) {
  return internalResearch.runResearchJob({
    prompt: internalPrompts.buildReportPrompt({
      analysisMarkdown,
      runDir,
      skill,
    }),
    schemaPath: config.reportSchemaPath,
    runDir,
    stageName: "reporting",
    onEvent,
  });
}

export async function runBenchmarkPlanningStage({
  skill,
  analysisMarkdown,
  benchmarkContext,
  runDir,
}) {
  return internalResearch.runResearchJob({
    prompt: internalPrompts.buildBenchmarkTradePrompt({
      skill,
      analysisMarkdown,
      benchmarkContext,
    }),
    schemaPath: config.benchmarkActionSchemaPath,
    runDir,
    stageName: "benchmarking",
    sandboxMode: "read-only",
  });
}
