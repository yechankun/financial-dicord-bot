import { requestReport } from "../../../usecases/requestReport.js";

export async function handleReportCommand({
  interaction,
  channelKey,
  activeChannelRuns,
  consumeChartQueueBatch,
  consumeBenchmarkQueueBatch,
}) {
  await requestReport({
    interaction,
    channelKey,
    activeChannelRuns,
    consumeChartQueueBatch,
    consumeBenchmarkQueueBatch,
  });
}
