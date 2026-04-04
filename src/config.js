import "dotenv/config";
import path from "node:path";

const cwd = process.cwd();

function readRequired(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readOptionalList(name) {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  discordToken: readRequired("DISCORD_BOT_TOKEN"),
  applicationId: readRequired("DISCORD_APPLICATION_ID"),
  guildId: process.env.DISCORD_GUILD_ID?.trim() || "",
  benchmarkInitialCash: Number(process.env.BENCHMARK_INITIAL_CASH || 10000),
  benchmarkBuyFeeRate: Number(process.env.BENCHMARK_BUY_FEE_RATE || 0.001),
  benchmarkSellFeeRate: Number(process.env.BENCHMARK_SELL_FEE_RATE || 0.001),
  allowedDiscordUserIds: readOptionalList("ALLOWED_DISCORD_USER_IDS"),
  workspaceDir: cwd,
  runsDir: path.join(cwd, "runs"),
  channelLocksDir: path.join(cwd, "runs", ".channel-locks"),
  reportJobQueueDir: path.join(cwd, "runs", "report-jobs"),
  reportJobQueuePendingDir: path.join(cwd, "runs", "report-jobs", "pending"),
  reportJobQueueProcessingDir: path.join(cwd, "runs", "report-jobs", "processing"),
  reportJobQueueProcessedDir: path.join(cwd, "runs", "report-jobs", "processed"),
  reportJobQueueLockDir: path.join(cwd, "runs", "report-jobs", ".worker-lock"),
  benchmarkDir: path.join(cwd, "benchmark"),
  benchmarkPortfolioPath: path.join(cwd, "benchmark", "portfolio.json"),
  benchmarkTradeHistoryPath: path.join(cwd, "benchmark", "trade-history.json"),
  benchmarkYahooQuoteCachePath: path.join(cwd, "benchmark", "yahoo-quote-cache.json"),
  benchmarkQueueDir: path.join(cwd, "benchmark", "queue"),
  benchmarkQueuePendingDir: path.join(cwd, "benchmark", "queue", "pending"),
  benchmarkQueueProcessingDir: path.join(cwd, "benchmark", "queue", "processing"),
  benchmarkQueueProcessedDir: path.join(cwd, "benchmark", "queue", "processed"),
  benchmarkQueueLockDir: path.join(cwd, "benchmark", "queue", ".worker-lock"),
  chartQueueDir: path.join(cwd, "charts", "queue"),
  chartQueuePendingDir: path.join(cwd, "charts", "queue", "pending"),
  chartQueueProcessingDir: path.join(cwd, "charts", "queue", "processing"),
  chartQueueProcessedDir: path.join(cwd, "charts", "queue", "processed"),
  chartQueueLockDir: path.join(cwd, "charts", "queue", ".worker-lock"),
  chartRenderScriptPath: path.join(cwd, "scripts", "render_druckenmiller_stack.py"),
  etfAggregateDbPath: path.join(cwd, "data", "etf_constituent_aggregates.sqlite3"),
  appDbPath: path.join(cwd, "data", "app.sqlite3"),
  etfDbQueryScriptPath: path.join(cwd, "scripts", "query_etf_db.py"),
  appDbQueryScriptPath: path.join(cwd, "scripts", "query_app_db.py"),
  guardSchemaPath: path.join(cwd, "schemas", "question-guard.schema.json"),
  producerSchemaPath: path.join(cwd, "schemas", "producer-output.schema.json"),
  benchmarkActionSchemaPath: path.join(cwd, "schemas", "benchmark-actions.schema.json"),
  researchSchemaPath: path.join(cwd, "schemas", "research-output.schema.json"),
  reportSchemaPath: path.join(cwd, "schemas", "report-output.schema.json"),
  skillsConfigPath: path.join(cwd, "config", "skills.json"),
};
