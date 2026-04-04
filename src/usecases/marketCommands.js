import {
  fetchEtfLookup,
  fetchEtfScreen,
  fetchStockScreen,
  fetchStockLookup,
} from "../gateways/internal/marketGateway.js";
import {
  fetchScreenPreference,
  putScreenPreference,
  removeScreenPreference,
} from "../gateways/internal/appGateway.js";

export async function runEtfScreen({ category, limit, criteria, discordUserId }) {
  let effectiveCriteria = criteria;
  if (
    category !== "overview" &&
    !String(criteria || "").trim() &&
    String(discordUserId || "").trim()
  ) {
    const savedPreference = await fetchScreenPreference({
      discordUserId,
      category,
    });
    if (savedPreference?.criteria_json) {
      effectiveCriteria = savedPreference.criteria_json;
    }
  }

  return fetchEtfScreen({
    category,
    limit,
    criteria: effectiveCriteria,
  });
}

export async function runEtfLookup({ symbol }) {
  return fetchEtfLookup({ symbol });
}

export async function runStockScreen({
  category,
  limit,
  criteria,
  industryHighlights,
  industries,
  perIndustryLimit,
  maxIndustries,
}) {
  return fetchStockScreen({
    category,
    limit,
    criteria,
    industryHighlights,
    industries,
    perIndustryLimit,
    maxIndustries,
  });
}

export async function runStockLookup({ symbol }) {
  return fetchStockLookup({ symbol });
}

export async function saveEtfScreenPreferenceUsecase({
  discordUserId,
  category,
  criteria,
}) {
  return putScreenPreference({
    discordUserId,
    category,
    criteria,
  });
}

export async function loadEtfScreenPreferenceUsecase({
  discordUserId,
  category,
}) {
  return fetchScreenPreference({
    discordUserId,
    category,
  });
}

export async function deleteEtfScreenPreferenceUsecase({
  discordUserId,
  category,
}) {
  return removeScreenPreference({
    discordUserId,
    category,
  });
}
