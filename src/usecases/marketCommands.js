import {
  fetchEtfLookup,
  fetchEtfScreen,
  fetchEtfScreenPreference,
  fetchStockLookup,
  putEtfScreenPreference,
  removeEtfScreenPreference,
} from "../gateways/internal/marketGateway.js";

export async function runEtfScreen({ category, limit, criteria, discordUserId }) {
  return fetchEtfScreen({
    category,
    limit,
    criteria,
    discordUserId,
  });
}

export async function runEtfLookup({ symbol }) {
  return fetchEtfLookup({ symbol });
}

export async function runStockLookup({ symbol }) {
  return fetchStockLookup({ symbol });
}

export async function saveEtfScreenPreferenceUsecase({
  discordUserId,
  category,
  criteria,
}) {
  return putEtfScreenPreference({
    discordUserId,
    category,
    criteria,
  });
}

export async function loadEtfScreenPreferenceUsecase({
  discordUserId,
  category,
}) {
  return fetchEtfScreenPreference({
    discordUserId,
    category,
  });
}

export async function deleteEtfScreenPreferenceUsecase({
  discordUserId,
  category,
}) {
  return removeEtfScreenPreference({
    discordUserId,
    category,
  });
}
