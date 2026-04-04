import { SlashCommandBuilder } from "discord.js";

import { addShareOption } from "./shared.js";

export function buildEtfScreenCommandJson() {
  return addShareOption(
    new SlashCommandBuilder()
      .setName("etfscreen")
      .setDescription("ETF DB를 다양한 관점으로 빠르게 스크리닝한다냥.")
      .addStringOption((option) =>
        option
          .setName("category")
          .setDescription("보고 싶은 분류를 골라달라냥.")
          .setRequired(true)
          .addChoices(
            { name: "개요", value: "overview" },
            { name: "저평가", value: "undervalued" },
            { name: "고평가", value: "overvalued" },
            { name: "이상치", value: "outlier" },
            { name: "현금흐름 좋음", value: "cashflow_good" },
            {
              name: "현금흐름·CAPEX 악화",
              value: "cashflow_capex_deterioration",
            },
            { name: "모멘텀 진행", value: "momentum" },
          ),
      )
      .addIntegerOption((option) =>
        option
          .setName("limit")
          .setDescription("보고 싶은 개수다냥. 기본 5개다냥.")
          .setMinValue(1)
          .setMaxValue(10),
      )
      .addStringOption((option) =>
        option
          .setName("criteria")
          .setDescription(
            "개별 카테고리용 JSON: 지표·방향·가중치·필터를 커스텀한다냥.",
          )
          .setMaxLength(4000),
      ),
  ).toJSON();
}

export function buildEtfLookupCommandJson() {
  return addShareOption(
    new SlashCommandBuilder()
      .setName("etf")
      .setDescription("특정 ETF의 집계 재무와 테크니컬을 보여준다냥.")
      .addStringOption((option) =>
        option
          .setName("symbol")
          .setDescription("자동완성: ETF명 | 추적지수")
          .setRequired(true)
          .setAutocomplete(true)
          .setMaxLength(64),
      ),
  ).toJSON();
}

export function buildStockLookupCommandJson() {
  return addShareOption(
    new SlashCommandBuilder()
      .setName("stock")
      .setDescription("특정 기업의 캐시된 재무를 보여준다냥.")
      .addStringOption((option) =>
        option
          .setName("symbol")
          .setDescription("자동완성: 회사명 | 거래소 | 최대매출국가 | 산업")
          .setRequired(true)
          .setAutocomplete(true)
          .setMaxLength(64),
      ),
  ).toJSON();
}

export function buildEtfScreenSaveCommandJson() {
  return new SlashCommandBuilder()
    .setName("etfscreen-save")
    .setDescription("ETF 스크린 criteria JSON을 내 설정으로 저장한다냥.")
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("저장할 개별 카테고리다냥.")
        .setRequired(true)
        .addChoices(
          { name: "저평가", value: "undervalued" },
          { name: "고평가", value: "overvalued" },
          { name: "이상치", value: "outlier" },
          { name: "현금흐름 좋음", value: "cashflow_good" },
          {
            name: "현금흐름·CAPEX 악화",
            value: "cashflow_capex_deterioration",
          },
          { name: "모멘텀 진행", value: "momentum" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("criteria")
        .setDescription("저장할 criteria JSON이다냥.")
        .setRequired(true)
        .setMaxLength(4000),
    )
    .toJSON();
}

export function buildEtfScreenPrefCommandJson() {
  return new SlashCommandBuilder()
    .setName("etfscreen-pref")
    .setDescription("저장된 ETF 스크린 설정을 확인하거나 지운다냥.")
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("무엇을 할지 골라달라냥.")
        .setRequired(true)
        .addChoices(
          { name: "조회", value: "show" },
          { name: "삭제", value: "delete" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("조회/삭제할 개별 카테고리다냥.")
        .setRequired(true)
        .addChoices(
          { name: "저평가", value: "undervalued" },
          { name: "고평가", value: "overvalued" },
          { name: "이상치", value: "outlier" },
          { name: "현금흐름 좋음", value: "cashflow_good" },
          {
            name: "현금흐름·CAPEX 악화",
            value: "cashflow_capex_deterioration",
          },
          { name: "모멘텀 진행", value: "momentum" },
        ),
    )
    .toJSON();
}
