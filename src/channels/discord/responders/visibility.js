import { MessageFlags } from "discord.js";

export function buildVisibilityReplyOptions(interaction, payload) {
  const share = interaction.options?.getBoolean("share") ?? false;
  const base =
    typeof payload === "string" ? { content: payload } : { ...(payload || {}) };
  return share ? base : { ...base, flags: MessageFlags.Ephemeral };
}

export function compactPreferenceJson(raw) {
  const text = String(raw || "");
  return text.length <= 1500 ? text : `${text.slice(0, 1490)}...`;
}
