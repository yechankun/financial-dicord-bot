import fs from "node:fs/promises";
import path from "node:path";

export function assertRunScopedAbsolutePath(runDir, filePath) {
  if (!path.isAbsolute(filePath)) {
    throw new Error(`Expected an absolute path, received: ${filePath}`);
  }

  const relative = path.relative(runDir, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Artifact path escaped the run directory: ${filePath}`);
  }
}

export async function validateReportArtifacts(runDir, report) {
  const candidates = [
    report.html_path,
    ...report.png_paths,
    ...(report.supporting_paths || []),
  ];

  for (const item of candidates) {
    assertRunScopedAbsolutePath(runDir, item);
    await fs.access(item);
  }
}

export function buildResearchArtifactPaths(runDir) {
  const producerRoot = path.join(runDir, "research-assets", "producers");
  const chartRoot = path.join(
    runDir,
    "research-assets",
    "charts",
    "candidates_dw",
  );
  return {
    policyMarkdownPath: path.join(producerRoot, "policy", "policy-search.md"),
    policyFactsPath: path.join(producerRoot, "policy", "policy-facts.json"),
    techSocialMarkdownPath: path.join(
      producerRoot,
      "tech-social",
      "tech-social-search.md",
    ),
    techSocialSignalsPath: path.join(
      producerRoot,
      "tech-social",
      "theme-signals.json",
    ),
    scanManifestJsonPath: path.join(producerRoot, "scan", "scan_manifest.json"),
    scanSummaryMarkdownPath: path.join(
      producerRoot,
      "scan",
      "candidate_summary.md",
    ),
    candidateTickersJsonPath: path.join(
      producerRoot,
      "scan",
      "candidate_tickers.json",
    ),
    candidateChartRootDir: chartRoot,
    candidateChartManifestPath: path.join(chartRoot, "manifest.json"),
  };
}

export async function ensureArtifactParentDirs(artifactPaths) {
  const dirs = [
    ...new Set(
      Object.values(artifactPaths).map((filePath) => path.dirname(filePath)),
    ),
  ];
  await Promise.all(
    dirs.map((dirPath) => fs.mkdir(dirPath, { recursive: true })),
  );
}

export async function validateArtifactPathsExist(filePaths) {
  for (const filePath of filePaths) {
    await fs.access(filePath);
  }
}

export async function resolveResearchMarkdown(runDir, researchJob) {
  const direct = researchJob?.result?.analysis_markdown?.trim();
  if (direct) {
    return direct;
  }

  const candidatePaths = [
    ...(researchJob?.result?.supporting_paths || []),
    path.join(runDir, "research-assets", "report.md"),
  ].filter((value, index, all) => value && all.indexOf(value) === index);

  for (const candidatePath of candidatePaths) {
    if (!candidatePath.endsWith(".md")) {
      continue;
    }

    const text = await fs.readFile(candidatePath, "utf8").catch(() => "");
    if (text.trim()) {
      return text;
    }
  }

  throw new Error(
    "Research phase finished but no reusable markdown report was found.",
  );
}
