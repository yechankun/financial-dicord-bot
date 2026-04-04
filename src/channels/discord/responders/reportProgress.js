import fs from "node:fs/promises";
import path from "node:path";

import { AttachmentBuilder } from "discord.js";

export async function loadAttachments(pngPaths) {
  return Promise.all(
    pngPaths.map(async (pngPath) => {
      const data = await fs.readFile(pngPath);
      return new AttachmentBuilder(data, { name: path.basename(pngPath) });
    }),
  );
}

export function formatElapsedDuration(startedAt) {
  const elapsedMs = Math.max(0, Date.now() - startedAt);
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function buildMetricsLine(progress) {
  return `(웹 검색: ${String(progress.webSearchCount || 0).padStart(2, "0")}회, 재무 조회: ${String(progress.financeLookupCount || 0).padStart(2, "0")}회, 차트 분석: ${String(progress.chartAnalysisCount || 0).padStart(2, "0")}회)`;
}

export function toNyangSentence(text, fallback) {
  const source = String(text || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!source) {
    return fallback;
  }

  if (/[냥][.!?…~]*$/u.test(source) || /다냥[.!?…~]*$/u.test(source)) {
    return source;
  }

  return `${source}냥.`;
}

export function buildProgressMessage(progress) {
  const skillLabel = progress.skillName || "선택한";
  const base =
    progress.phase === "chart"
      ? "후보 차트를 만들고 있다냥."
      : progress.phase === "report"
        ? "최종 보고서를 렌더링중이다냥."
        : `${skillLabel} 스킬을 써서 리포트를 준비한다냥.`;
  const stepLine =
    Number.isInteger(progress.activeStepIndex) &&
    Number.isInteger(progress.totalSteps)
      ? `현재 ${progress.activeStepIndex}/${progress.totalSteps} 단계다냥: ${progress.activeStepText || "진행 중이다냥"}`
      : progress.phase === "chart"
        ? toNyangSentence(
            progress.activeStepText,
            "후보 차트를 준비하고 있다냥.",
          )
        : "";
  const metricsLine = buildMetricsLine(progress);

  return [base, stepLine, metricsLine].filter(Boolean).join("\n");
}
