import { internalAppStorage } from "./provider.js";

export async function fetchReportAccessStatus({ discordUserId }) {
  return internalAppStorage.getReportAccessStatus({ discordUserId });
}

export async function grantReportAccess({ discordUserId }) {
  return internalAppStorage.authorizeReportAccess({ discordUserId });
}
