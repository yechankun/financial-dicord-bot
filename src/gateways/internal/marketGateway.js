import { internalMarketStorage } from "./provider.js";

export async function fetchEtfScreen({
  category,
  limit,
  criteria,
  discordUserId,
}) {
  return internalMarketStorage.buildEtfScreenMessage({
    category,
    limit,
    criteria,
    discordUserId,
  });
}

export async function fetchEtfLookup({ symbol }) {
  return internalMarketStorage.buildEtfLookupMessage(symbol);
}

export async function fetchStockLookup({ symbol }) {
  return internalMarketStorage.buildStockLookupMessage(symbol);
}

export async function fetchSymbolAutocomplete({ dataset, query }) {
  return internalMarketStorage.buildSymbolAutocompleteChoices({ dataset, query });
}

export async function putEtfScreenPreference({
  discordUserId,
  category,
  criteria,
}) {
  return internalMarketStorage.saveEtfScreenPreference({
    discordUserId,
    category,
    criteria,
  });
}

export async function fetchEtfScreenPreference({
  discordUserId,
  category,
}) {
  return internalMarketStorage.loadEtfScreenPreference({
    discordUserId,
    category,
  });
}

export async function removeEtfScreenPreference({
  discordUserId,
  category,
}) {
  return internalMarketStorage.deleteEtfScreenPreference({
    discordUserId,
    category,
  });
}
