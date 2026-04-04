import { internalMarketStorage } from "./provider.js";

export async function fetchEtfScreen({
  category,
  limit,
  criteria,
}) {
  return internalMarketStorage.buildEtfScreenMessage({
    category,
    limit,
    criteria,
  });
}

export async function fetchStockScreen({
  category,
  limit,
  criteria,
  industryHighlights,
  industries,
  perIndustryLimit,
  maxIndustries,
}) {
  return internalMarketStorage.buildStockScreenMessage({
    category,
    limit,
    criteria,
    industryHighlights,
    industries,
    perIndustryLimit,
    maxIndustries,
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
