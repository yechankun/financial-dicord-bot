import { PineTS, Provider } from 'pinets';
import { alignSecondaryValue, fetchFinraCandles, inferFinraFieldFromParam, resolveFinraFieldName } from './finra';
import {
    fetchYahooJson,
    fetchYahooFinancialCatalog,
    fetchYahooSplits,
    fetchYahooSymbolSnapshot,
    normalizeYahooLookupSymbol,
    type YahooFinancialCatalog,
    type YahooFinancialMetric,
    type YahooFinancialPeriod,
    type YahooFinancialPoint,
    type YahooSplitEvent,
    type YahooSymbolSnapshot,
} from './yahoo';

export type DataSource = 'yahoo' | 'binance' | 'finra';
export type PlotPane = 'overlay' | 'oscillator';

export type Candle = {
    openTime: number;
    closeTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};

export type PinePlotPoint = {
    title: string;
    time: number;
    value: number;
    options?: Record<string, unknown>;
};

export type PinePlotSeries = {
    id: string;
    title: string;
    color: string;
    style: string;
    pane: PlotPane;
    data: PinePlotPoint[];
};

export type PineLineDrawing = {
    id: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    xloc: string;
    extend: string;
    color: string;
    style: string;
    width: number;
    forceOverlay: boolean;
};

export type PineShapeMarker = {
    id: string;
    title: string;
    time: number;
    color: string;
    text: string;
    shape: string;
    location: string;
    size: string;
    pane: PlotPane;
};

type RawPlot = {
    data?: Array<{
        time?: number;
        value?: unknown;
        options?: Record<string, unknown>;
    }>;
};

type PlotDirective = {
    title: string;
    style?: string;
    display?: string;
};

type IndicatorDirective = {
    overlay?: boolean;
};

export type RunAnalysisOptions = {
    source: DataSource;
    symbol: string;
    timeframe: string;
    limit?: number;
    pineCode: string;
};

export type RunAnalysisResult = {
    source: DataSource;
    symbol: string;
    timeframe: string;
    limit: number;
    candles: Candle[];
    series: PinePlotSeries[];
    lines: PineLineDrawing[];
    markers: PineShapeMarker[];
    warnings: string[];
};

export type LoadedMarketData = {
    source: DataSource;
    symbol: string;
    timeframe: string;
    limit: number;
    candles: Candle[];
};

const YAHOO_INTERVAL_MAP: Record<string, string> = {
    D: '1d',
    W: '1wk',
    M: '1mo',
    '60': '60m',
};

const YAHOO_RANGE_BY_LIMIT = (limit: number, timeframe: string) => {
    if (timeframe === '60') {
        if (limit <= 100) return '1mo';
        if (limit <= 500) return '6mo';
        return '2y';
    }

    if (timeframe === 'W') {
        if (limit <= 104) return '5y';
        return '10y';
    }

    if (timeframe === 'M') return 'max';

    if (limit <= 130) return '1y';
    if (limit <= 260) return '2y';
    if (limit <= 780) return '5y';
    return '10y';
};

function invariant(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

export function clampLimit(limit: number | undefined, fallback = 300) {
    if (!Number.isFinite(limit)) return fallback;
    return Math.max(50, Math.min(2000, Math.floor(limit ?? fallback)));
}

export function normalizeSource(value: string | undefined): DataSource {
    if (value === 'binance') return 'binance';
    if (value === 'finra') return 'finra';
    return 'yahoo';
}

export function normalizeYahooSymbol(symbol: string) {
    return symbol.trim().toUpperCase();
}

export function normalizeBinanceSymbol(symbol: string) {
    return symbol.replace(/[/.:-]/g, '').trim().toUpperCase();
}

export function normalizeTimeframe(source: DataSource, timeframe: string | undefined) {
    const normalized = (timeframe ?? 'D').toUpperCase();
    if (source === 'finra') {
        if (!['D', 'W', 'M'].includes(normalized)) {
            throw new Error('FINRA source currently supports D, W, and M timeframes.');
        }
        return normalized;
    }
    if (source === 'yahoo') {
        if (!['D', 'W', 'M', '60'].includes(normalized)) {
            throw new Error('Yahoo source currently supports D, W, M, and 60 timeframes.');
        }
        return normalized;
    }
    if (!['1', '3', '5', '15', '30', '60', '120', '240', 'D', 'W', 'M'].includes(normalized)) {
        throw new Error('Unsupported Binance timeframe.');
    }
    return normalized;
}

export async function fetchYahooCandles(symbol: string, timeframe: string, limit: number): Promise<Candle[]> {
    const interval = YAHOO_INTERVAL_MAP[timeframe];
    invariant(interval, `Unsupported Yahoo timeframe: ${timeframe}`);

    const range = YAHOO_RANGE_BY_LIMIT(limit, timeframe);
    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
    url.searchParams.set('interval', interval);
    url.searchParams.set('range', range);
    url.searchParams.set('includePrePost', 'false');
    url.searchParams.set('events', 'div,splits');

    const payload = await fetchYahooJson<{
        chart?: {
            result?: Array<{
                timestamp?: number[];
                indicators?: {
                    quote?: Array<{
                        open?: number[];
                        high?: number[];
                        low?: number[];
                        close?: number[];
                        volume?: number[];
                    }>;
                };
            }>;
        };
    }>(url);
    const result = payload?.chart?.result?.[0];
    const timestamps: number[] | undefined = result?.timestamp;
    const quote = result?.indicators?.quote?.[0];
    invariant(Array.isArray(timestamps) && quote, `No Yahoo candle data for ${symbol}.`);

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i += 1) {
        const open = Number(quote.open?.[i]);
        const high = Number(quote.high?.[i]);
        const low = Number(quote.low?.[i]);
        const close = Number(quote.close?.[i]);
        const volume = Number(quote.volume?.[i] ?? 0);
        const openTime = timestamps[i] * 1000;
        if (![open, high, low, close].every(Number.isFinite)) continue;

        candles.push({
            openTime,
            closeTime: i < timestamps.length - 1 ? timestamps[i + 1] * 1000 : openTime,
            open,
            high,
            low,
            close,
            volume: Number.isFinite(volume) ? volume : 0,
        });
    }

    return candles.slice(-limit);
}

export function sortCandlesAscending(candles: Candle[]) {
    return [...candles].sort((a, b) => a.openTime - b.openTime);
}

function splitTopLevelArgs(input: string) {
    const args: string[] = [];
    let current = '';
    let depth = 0;
    let quote: '"' | "'" | null = null;

    for (let index = 0; index < input.length; index += 1) {
        const char = input[index];
        const prev = input[index - 1];

        if (quote) {
            current += char;
            if (char === quote && prev !== '\\') {
                quote = null;
            }
            continue;
        }

        if (char === '"' || char === "'") {
            quote = char;
            current += char;
            continue;
        }

        if (char === '(' || char === '[' || char === '{') {
            depth += 1;
            current += char;
            continue;
        }

        if (char === ')' || char === ']' || char === '}') {
            depth = Math.max(0, depth - 1);
            current += char;
            continue;
        }

        if (char === ',' && depth === 0) {
            args.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    if (current.trim()) {
        args.push(current.trim());
    }

    return args;
}

function normalizePlotStyleName(style: string) {
    if (!style.startsWith('style_')) return style;
    return style.slice('style_'.length);
}

function extractIndicatorDirective(pineCode: string): IndicatorDirective {
    const source = pineCode ?? '';
    const start = source.indexOf('indicator(');
    if (start < 0) return {};

    let cursor = start + 'indicator('.length;
    let depth = 1;
    let quote: '"' | "'" | null = null;
    let call = '';

    while (cursor < source.length && depth > 0) {
        const char = source[cursor];
        const prev = source[cursor - 1];

        if (quote) {
            call += char;
            if (char === quote && prev !== '\\') {
                quote = null;
            }
            cursor += 1;
            continue;
        }

        if (char === '"' || char === "'") {
            quote = char;
            call += char;
            cursor += 1;
            continue;
        }

        if (char === '(') {
            depth += 1;
            call += char;
            cursor += 1;
            continue;
        }

        if (char === ')') {
            depth -= 1;
            if (depth > 0) {
                call += char;
            }
            cursor += 1;
            continue;
        }

        call += char;
        cursor += 1;
    }

    const args = splitTopLevelArgs(call);
    const overlayArg = args.find((arg) => arg.startsWith('overlay=') || arg.startsWith('overlay ='));
    if (!overlayArg) return {};
    const overlayMatch = overlayArg.match(/overlay\s*=\s*(true|false)/);
    return overlayMatch ? { overlay: overlayMatch[1] === 'true' } : {};
}

function extractPlotDirectives(pineCode: string) {
    const directives = new Map<string, PlotDirective>();
    const source = pineCode ?? '';

    for (let index = 0; index < source.length; index += 1) {
        if (!source.startsWith('plot(', index)) continue;
        let cursor = index + 'plot('.length;
        let depth = 1;
        let quote: '"' | "'" | null = null;
        let call = '';

        while (cursor < source.length && depth > 0) {
            const char = source[cursor];
            const prev = source[cursor - 1];

            if (quote) {
                call += char;
                if (char === quote && prev !== '\\') {
                    quote = null;
                }
                cursor += 1;
                continue;
            }

            if (char === '"' || char === "'") {
                quote = char;
                call += char;
                cursor += 1;
                continue;
            }

            if (char === '(') {
                depth += 1;
                call += char;
                cursor += 1;
                continue;
            }

            if (char === ')') {
                depth -= 1;
                if (depth > 0) {
                    call += char;
                }
                cursor += 1;
                continue;
            }

            call += char;
            cursor += 1;
        }

        index = cursor;

        const args = splitTopLevelArgs(call);
        if (args.length < 2) continue;

        const positionalTitleMatch = args[1]?.match(/^["'](.+?)["']$/);
        const namedTitleArg = args.find((arg) => arg.startsWith('title=') || arg.startsWith('title ='));
        const namedTitleMatch = namedTitleArg?.match(/title\s*=\s*["'](.+?)["']/);
        const title = positionalTitleMatch?.[1] ?? namedTitleMatch?.[1];
        if (!title) continue;

        const styleArg = args.find((arg) => arg.startsWith('style=') || arg.startsWith('style ='));
        const styleMatch = styleArg?.match(/style\s*=\s*plot\.(style_[A-Za-z0-9_]+)/);
        const displayArg = args.find((arg) => arg.startsWith('display=') || arg.startsWith('display ='));
        const displayMatch = displayArg?.match(/display\s*=\s*display\.([A-Za-z0-9_]+)/);

        directives.set(title, {
            title,
            style: styleMatch ? normalizePlotStyleName(styleMatch[1]) : undefined,
            display: displayMatch?.[1],
        });
    }

    return directives;
}

export function normalizePlotData(
    rawPlots: Record<string, RawPlot>,
    candles: Candle[],
    directives?: Map<string, PlotDirective>,
    indicatorDirective?: IndicatorDirective,
): PinePlotSeries[] {
    const priceMin = Math.min(...candles.map((c) => c.low));
    const priceMax = Math.max(...candles.map((c) => c.high));
    const priceRange = Math.max(priceMax - priceMin, 1);

    return Object.entries(rawPlots)
        .filter(([key]) => !key.startsWith('__'))
        .map(([title, plot]) => {
            const normalizedPoints: PinePlotPoint[] = (plot.data ?? [])
                .filter((point) => Number.isFinite(point?.time) && Number.isFinite(point?.value))
                .map((point) => ({
                    title,
                    time: Number(point.time),
                    value: Number(point.value),
                    options: point.options ?? {},
                }))
                .sort((a, b) => a.time - b.time);

            if (normalizedPoints.length === 0) {
                return null;
            }

            const sampleOptions = normalizedPoints.find((point) => point.options)?.options ?? {};
            const directive = directives?.get(title);
            if (directive?.display === 'none') {
                return null;
            }
            const style =
                typeof sampleOptions.style === 'string'
                    ? sampleOptions.style
                    : directive?.style
                      ? directive.style
                      : 'line';
            const color = typeof sampleOptions.color === 'string' ? sampleOptions.color : '#f4b942';
            const values = normalizedPoints.map((point) => point.value);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const pane: PlotPane =
                indicatorDirective?.overlay === false
                    ? 'oscillator'
                    : style === 'histogram' ||
                        style === 'columns' ||
                        min < priceMin - priceRange * 0.35 ||
                        max > priceMax + priceRange * 0.35
                      ? 'oscillator'
                      : 'overlay';

            return {
                id: title,
                title,
                color,
                style,
                pane,
                data: normalizedPoints,
            };
        })
        .filter((item): item is PinePlotSeries => item != null);
}

export function normalizeLineDrawings(rawPlots: Record<string, RawPlot>): PineLineDrawing[] {
    const rawLineSnapshots = rawPlots.__lines__?.data ?? [];
    const lineMap = new Map<number, PineLineDrawing>();

    for (const snapshot of rawLineSnapshots) {
        const drawings = Array.isArray(snapshot?.value) ? snapshot.value : [];
        for (const drawing of drawings) {
            if (!drawing || typeof drawing !== 'object') continue;
            const raw = drawing as Record<string, unknown>;
            const id = Number(raw.id);
            if (!Number.isFinite(id)) continue;
            if (raw._deleted === true) {
                lineMap.delete(id);
                continue;
            }

            lineMap.set(id, {
                id,
                x1: Number(raw.x1),
                y1: Number(raw.y1),
                x2: Number(raw.x2),
                y2: Number(raw.y2),
                xloc: typeof raw.xloc === 'string' ? raw.xloc : 'bi',
                extend: typeof raw.extend === 'string' ? raw.extend : 'none',
                color: typeof raw.color === 'string' && raw.color ? raw.color : '#5AB1BB',
                style: typeof raw.style === 'string' ? raw.style : 'style_solid',
                width: Number.isFinite(Number(raw.width)) ? Number(raw.width) : 1,
                forceOverlay: raw.force_overlay === true,
            });
        }
    }

    return [...lineMap.values()];
}

export function normalizeShapeMarkers(
    rawPlots: Record<string, RawPlot>,
    indicatorDirective?: IndicatorDirective,
): PineShapeMarker[] {
    const pane: PlotPane = indicatorDirective?.overlay === false ? 'oscillator' : 'overlay';

    return Object.entries(rawPlots)
        .filter(([key]) => !key.startsWith('__'))
        .flatMap(([title, plot]) =>
            (plot.data ?? [])
                .filter(
                    (point) =>
                        point?.value === true &&
                        Number.isFinite(point?.time) &&
                        typeof point.options?.shape === 'string',
                )
                .map((point, index) => {
                    const options = point.options ?? {};
                    return {
                        id: `${title}-${Number(point.time)}-${index}`,
                        title,
                        time: Number(point.time),
                        color: typeof options.color === 'string' ? options.color : '#f4b942',
                        text: typeof options.text === 'string' && options.text ? options.text : title.slice(0, 1),
                        shape: typeof options.shape === 'string' ? options.shape : 'shape_label_up',
                        location: typeof options.location === 'string' ? options.location : 'Top',
                        size: typeof options.size === 'string' ? options.size : 'small',
                        pane,
                    };
                }),
        );
}

export async function loadMarketData(options: Omit<RunAnalysisOptions, 'pineCode'>): Promise<LoadedMarketData> {
    const source = normalizeSource(options.source);
    const timeframe = normalizeTimeframe(source, options.timeframe);
    const limit = clampLimit(options.limit);

    if (source === 'finra') {
        const symbol = options.symbol.trim().toUpperCase();
        const candles = await fetchFinraCandles(process.cwd(), symbol, timeframe as 'D' | 'W' | 'M', limit);
        invariant(candles.length > 20, `Not enough FINRA data returned for ${symbol}.`);
        return {
            source,
            symbol,
            timeframe,
            limit,
            candles: sortCandlesAscending(candles),
        };
    }

    if (source === 'binance') {
        const symbol = normalizeBinanceSymbol(options.symbol);
        const pine = new PineTS(Provider.Binance, symbol, timeframe, limit);
        const context = await pine.run(`//@version=5
indicator("Price Only", overlay=true)
`);
        const candles = sortCandlesAscending((context.marketData as Candle[]) ?? []);
        invariant(candles.length > 30, `Not enough candle data returned for ${symbol}.`);
        return {
            source,
            symbol,
            timeframe,
            limit,
            candles,
        };
    }

    const symbol = normalizeYahooSymbol(options.symbol);
    const candles = await fetchYahooCandles(symbol, timeframe, limit);
    invariant(candles.length > 30, `Not enough candle data returned for ${symbol}.`);
    return {
        source,
        symbol,
        timeframe,
        limit,
        candles: sortCandlesAscending(candles),
    };
}

function patchSecurity(
    pine: PineTS,
    options: {
        source: DataSource;
        symbol: string;
        timeframe: string;
        limit: number;
        baseDir: string;
        primaryYahooSnapshot?: YahooSymbolSnapshot | null;
        primaryYahooSplits?: YahooSplitEvent[];
        primaryYahooFinancials?: YahooFinancialCatalog | null;
    },
) {
    const originalInitializeContext = pine._initializeContext.bind(pine);
    pine.source = options.source === 'binance' ? new PineTS(Provider.Binance, options.symbol, options.timeframe, options.limit).source : pine.source;
    pine.tickerId = options.symbol;
    pine.timeframe = options.timeframe;
    pine.limit = options.limit;
    pine.sDate = candlesStart(pine.data);
    pine.eDate = candlesEnd(pine.data);

    pine._initializeContext = function patchedInitializeContext(code, inputs = {}, isSecondary = false) {
        const context = originalInitializeContext(code, inputs, isSecondary);
        const fallbackSecurity = context.pine.request.security;
        const finraCache = new Map<string, Promise<Candle[]>>();
        const fieldCache = new Map<string, 'open' | 'high' | 'low' | 'close' | 'volume'>();

        const ticker = normalizeYahooLookupSymbol(options.symbol);
        const primaryType = options.primaryYahooSnapshot?.syminfoType ?? null;
        const syminfo = {
            ...((context.pine?.syminfo as Record<string, unknown> | undefined) ?? {}),
            ...((context.syminfo as Record<string, unknown> | undefined) ?? {}),
            ticker,
            tickerid: options.symbol,
            type: primaryType ?? (((context.pine?.syminfo as Record<string, unknown> | undefined) ?? {}).type ?? 'stock'),
        };
        context.syminfo = {
            ...syminfo,
        };
        context.pine.syminfo = syminfo;

        context.pine.request.financial = (...args: unknown[]) => {
            const symbolArg = extractSecurityArg(args[0]);
            const metricArg = extractSecurityArg(args[1]);
            if (typeof symbolArg !== 'string' || typeof metricArg !== 'string') {
                return Number.NaN;
            }

            const normalized = normalizeYahooLookupSymbol(symbolArg);
            const snapshot = normalized === ticker ? options.primaryYahooSnapshot : null;
            if (!snapshot) {
                context.warn('request.financial currently supports the active chart symbol only.', 'request.financial');
                return Number.NaN;
            }

            const metric = metricArg.toUpperCase();
            const periodArg = extractSecurityArg(args[2]);
            const period =
                typeof periodArg === 'string' && ['D', 'FQ', 'FH', 'FY'].includes(periodArg.toUpperCase())
                    ? (periodArg.toUpperCase() as YahooFinancialPeriod)
                    : 'FQ';

            if (metric === 'TOTAL_SHARES_OUTSTANDING') {
                return snapshot.sharesOutstanding ?? Number.NaN;
            }

            if (
                metric === 'AUM' ||
                metric === 'NAV' ||
                metric === 'NAV_ALL' ||
                metric === 'TOTAL_ASSETS' ||
                metric === 'TOTAL_EQUITY' ||
                metric === 'RETURN_ON_ASSETS' ||
                metric === 'RETURN_ON_EQUITY' ||
                metric === 'RETURN_ON_TANG_EQUITY'
            ) {
                const catalog = options.primaryYahooFinancials;
                if (!catalog) return Number.NaN;
                const points = catalog[metric as YahooFinancialMetric]?.[period] ?? [];
                return alignFinancialValue(context.data.openTime.get(0), points);
            }

            context.warn(`Unsupported request.financial metric: ${metricArg}.`, 'request.financial');
            return Number.NaN;
        };

        context.pine.request.splits = (...args: unknown[]) => {
            const symbolArg = extractSecurityArg(args[0]);
            const splitFieldArg = extractSecurityArg(args[1]);
            if (typeof symbolArg !== 'string' || typeof splitFieldArg !== 'string') {
                return Number.NaN;
            }

            const splitField =
                splitFieldArg === context.pine.splits?.numerator || splitFieldArg === 'splits_numerator'
                    ? 'numerator'
                    : splitFieldArg === context.pine.splits?.denominator || splitFieldArg === 'splits_denominator'
                      ? 'denominator'
                      : null;
            if (!splitField) {
                context.warn('Unsupported request.splits field. Use splits.numerator or splits.denominator.', 'request.splits');
                return Number.NaN;
            }

            const normalized = normalizeYahooLookupSymbol(symbolArg);
            const splits = normalized === ticker ? options.primaryYahooSplits ?? [] : [];
            if (normalized !== ticker) {
                context.warn('request.splits currently supports the active chart symbol only.', 'request.splits');
                return Number.NaN;
            }
            const openTime = context.data.openTime.get(0);
            const closeTime = context.data.closeTime.get(0);
            const match = splits.find((event) => openTime <= event.time && event.time < closeTime);
            return match ? match[splitField] : Number.NaN;
        };

        context.pine.request.security = async (...args: unknown[]) => {
            const symbolArg = extractSecurityArg(args[0]);
            if (typeof symbolArg !== 'string' || !symbolArg.toUpperCase().startsWith('FINRA:')) {
                if (options.source === 'binance' && typeof fallbackSecurity === 'function') {
                    return fallbackSecurity(...(args as never[]));
                }
                return Number.NaN;
            }

            const timeframeArg = extractSecurityArg(args[1]);
            const timeframe = normalizeTimeframe('finra', typeof timeframeArg === 'string' ? timeframeArg : 'D') as 'D' | 'W' | 'M';
            const expressionArg = Array.isArray(args[2]) ? args[2][0] : args[2];
            const paramId = Array.isArray(args[2]) && typeof args[2][1] === 'string' ? args[2][1] : null;
            let field =
                resolveFinraFieldName(expressionArg, context.data) ??
                (paramId ? fieldCache.get(paramId) ?? null : null) ??
                (paramId ? inferFinraFieldFromParam(context.params?.[paramId], context.data as Record<string, { data?: unknown[] }>) : null);

            if (paramId && field) {
                fieldCache.set(paramId, field);
            }

            if (!field) {
                context.warn('Unsupported FINRA request.security expression. Use open/high/low/close/volume.', 'request.security');
                return Number.NaN;
            }

            const cacheKey = `${symbolArg}:${timeframe}`;
            if (!finraCache.has(cacheKey)) {
                finraCache.set(cacheKey, fetchFinraCandles(options.baseDir, symbolArg, timeframe, Math.max(options.limit, 320)));
            }
            const secondaryCandles = await finraCache.get(cacheKey)!;
            return alignSecondaryValue(
                context.data.openTime.get(0),
                context.data.closeTime.get(0),
                secondaryCandles,
                field,
            );
        };

        return context;
    };
}

function extractSecurityArg(value: unknown) {
    if (Array.isArray(value)) value = value[0];
    if (value && typeof value === 'object' && 'get' in value && typeof (value as { get: (index: number) => unknown }).get === 'function') {
        return (value as { get: (index: number) => unknown }).get(0);
    }
    return value;
}

function alignFinancialValue(openTime: number, points: YahooFinancialPoint[]) {
    let lastValue = Number.NaN;
    for (const point of points) {
        if (point.time <= openTime) {
            lastValue = point.value;
            continue;
        }
        break;
    }
    return lastValue;
}

function candlesStart(candles: Candle[]) {
    return candles.length > 0 ? candles[0].openTime : undefined;
}

function candlesEnd(candles: Candle[]) {
    return candles.length > 0 ? candles[candles.length - 1].closeTime : undefined;
}

export async function runPineOnCandles(
    candles: Candle[],
    pineCode: string,
    options?: {
        source?: DataSource;
        symbol?: string;
        timeframe?: string;
        limit?: number;
        baseDir?: string;
    },
) {
    const normalizedCandles = sortCandlesAscending(candles);
    const code = pineCode?.trim();
    invariant(code, 'Pine code is required.');
    const primaryYahooSnapshot =
        options?.source && options.source !== 'binance' && options?.symbol
            ? await fetchYahooSymbolSnapshot(options?.baseDir ?? process.cwd(), options.symbol)
            : null;
    const primaryYahooSplits =
        options?.source && options.source !== 'binance' && options?.symbol
            ? await fetchYahooSplits(options?.baseDir ?? process.cwd(), options.symbol)
            : [];
    const primaryYahooFinancials =
        options?.source && options.source !== 'binance' && options?.symbol
            ? await fetchYahooFinancialCatalog(options?.baseDir ?? process.cwd(), options.symbol)
            : null;
    const pine = new PineTS(normalizedCandles);
    patchSecurity(pine, {
        source: options?.source ?? 'yahoo',
        symbol: options?.symbol ?? '',
        timeframe: options?.timeframe ?? 'D',
        limit: options?.limit ?? normalizedCandles.length,
        baseDir: options?.baseDir ?? process.cwd(),
        primaryYahooSnapshot,
        primaryYahooSplits,
        primaryYahooFinancials,
    });
    const context = await pine.run(code);
    const plotDirectives = extractPlotDirectives(code);
    const indicatorDirective = extractIndicatorDirective(code);
    const warnings = (context.warnings ?? []).map((warning) => {
        if (typeof warning === 'string') return warning;
        if (warning && typeof warning === 'object' && 'message' in warning) {
            return String((warning as { message?: unknown }).message ?? '');
        }
        return String(warning);
    });

    return {
        candles: normalizedCandles,
        series: normalizePlotData(context.plots ?? {}, normalizedCandles, plotDirectives, indicatorDirective),
        lines: normalizeLineDrawings(context.plots ?? {}),
        markers: normalizeShapeMarkers(context.plots ?? {}, indicatorDirective),
        warnings,
    };
}

export async function runPineAnalysis(options: RunAnalysisOptions): Promise<RunAnalysisResult> {
    const pineCode = options.pineCode?.trim();
    invariant(pineCode, 'Pine code is required.');
    const market = await loadMarketData(options);
    const result = await runPineOnCandles(market.candles, pineCode, {
        source: market.source,
        symbol: market.symbol,
        timeframe: market.timeframe,
        limit: market.limit,
        baseDir: process.cwd(),
    });

    return {
        source: market.source,
        symbol: market.symbol,
        timeframe: market.timeframe,
        limit: market.limit,
        candles: result.candles,
        series: result.series,
        lines: result.lines,
        markers: result.markers,
        warnings: result.warnings,
    };
}
