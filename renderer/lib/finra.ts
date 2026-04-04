import fs from 'node:fs/promises';
import path from 'node:path';

import type { Candle } from './pine-workbench';

export type FinraMetric = 'short-volume' | 'short-exempt-volume' | 'total-volume' | 'short-ratio';

type FinraRecord = {
    date: string;
    symbol: string;
    shortVolume: number;
    shortExemptVolume: number;
    totalVolume: number;
    market: string;
};

const FINRA_BASE_URL = 'https://cdn.finra.org/equity/regsho/daily';
const FINRA_PREFIX = 'CNMS';
const FINRA_CACHE_DIR = path.join('.pinets', 'cache', 'finra');

function invariant(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

function formatDateId(date: Date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function dateIdToOpenTime(dateId: string) {
    return Date.UTC(Number(dateId.slice(0, 4)), Number(dateId.slice(4, 6)) - 1, Number(dateId.slice(6, 8)));
}

function addDays(date: Date, offset: number) {
    return new Date(date.getTime() + offset * 86400000);
}

function weekKey(time: number) {
    const date = new Date(time);
    const weekday = date.getUTCDay();
    const offset = weekday === 0 ? -6 : 1 - weekday;
    return formatDateId(addDays(date, offset));
}

function monthKey(time: number) {
    const date = new Date(time);
    return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}01`;
}

export function normalizeFinraSymbol(input: string) {
    const normalized = input.trim().toUpperCase().replace(/^FINRA:/, '');
    if (normalized.endsWith('_SHORT_VOLUME')) {
        return { baseSymbol: normalized.slice(0, -'_SHORT_VOLUME'.length), metric: 'short-volume' as const };
    }
    if (normalized.endsWith('_SHORT_EXEMPT_VOLUME')) {
        return { baseSymbol: normalized.slice(0, -'_SHORT_EXEMPT_VOLUME'.length), metric: 'short-exempt-volume' as const };
    }
    if (normalized.endsWith('_TOTAL_VOLUME')) {
        return { baseSymbol: normalized.slice(0, -'_TOTAL_VOLUME'.length), metric: 'total-volume' as const };
    }
    if (normalized.endsWith('_SHORT_RATIO')) {
        return { baseSymbol: normalized.slice(0, -'_SHORT_RATIO'.length), metric: 'short-ratio' as const };
    }
    return { baseSymbol: normalized, metric: 'short-volume' as const };
}

function metricValue(record: FinraRecord, metric: FinraMetric) {
    if (metric === 'short-exempt-volume') return record.shortExemptVolume;
    if (metric === 'total-volume') return record.totalVolume;
    if (metric === 'short-ratio') return record.totalVolume > 0 ? record.shortVolume / record.totalVolume : 0;
    return record.shortVolume;
}

async function ensureCacheDir(baseDir: string) {
    const cacheDir = path.resolve(baseDir, FINRA_CACHE_DIR);
    await fs.mkdir(cacheDir, { recursive: true });
    return cacheDir;
}

async function readOrFetchDailyFile(baseDir: string, dateId: string) {
    const cacheDir = await ensureCacheDir(baseDir);
    const cachePath = path.join(cacheDir, `${FINRA_PREFIX}shvol${dateId}.txt`);
    try {
        return await fs.readFile(cachePath, 'utf8');
    } catch (error) {
        if ((error as { code?: string }).code !== 'ENOENT') throw error;
    }

    const url = `${FINRA_BASE_URL}/${FINRA_PREFIX}shvol${dateId}.txt`;
    const response = await fetch(url, {
        headers: {
            'user-agent': 'Mozilla/5.0 PineTS-Local-Workbench',
        },
    });
    if (response.status === 404 || response.status === 403) return null;
    if (!response.ok) {
        throw new Error(`FINRA request failed with ${response.status} for ${dateId}.`);
    }

    const text = await response.text();
    await fs.writeFile(cachePath, text, 'utf8');
    return text;
}

async function fetchDailyRecord(baseDir: string, symbol: string, dateId: string): Promise<FinraRecord | null> {
    const text = await readOrFetchDailyFile(baseDir, dateId);
    if (!text) return null;

    const prefix = `${dateId}|${symbol}|`;
    const line = text.split(/\r?\n/).find((item) => item.startsWith(prefix));
    if (!line) return null;
    const [, rowSymbol, shortVolume, shortExemptVolume, totalVolume, market] = line.split('|');
    return {
        date: dateId,
        symbol: rowSymbol,
        shortVolume: Number(shortVolume),
        shortExemptVolume: Number(shortExemptVolume),
        totalVolume: Number(totalVolume),
        market: market ?? '',
    };
}

function aggregateSyntheticCandles(candles: Candle[], timeframe: 'D' | 'W' | 'M') {
    if (timeframe === 'D') return candles;
    const groups = new Map<string, Candle[]>();
    for (const candle of candles) {
        const key = timeframe === 'W' ? weekKey(candle.openTime) : monthKey(candle.openTime);
        const existing = groups.get(key) ?? [];
        existing.push(candle);
        groups.set(key, existing);
    }

    return [...groups.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([, group]) => {
            const first = group[0];
            const last = group[group.length - 1];
            const summedMetric = group.reduce((sum, item) => sum + item.close, 0);
            return {
                openTime: first.openTime,
                closeTime: last.closeTime,
                open: summedMetric,
                high: summedMetric,
                low: summedMetric,
                close: summedMetric,
                volume: group.reduce((sum, item) => sum + item.volume, 0),
            } satisfies Candle;
        });
}

export async function fetchFinraCandles(
    baseDir: string,
    symbolInput: string,
    timeframe: 'D' | 'W' | 'M',
    limit: number,
): Promise<Candle[]> {
    const { baseSymbol, metric } = normalizeFinraSymbol(symbolInput);
    invariant(baseSymbol, 'A FINRA symbol is required.');

    const records: FinraRecord[] = [];
    const today = new Date();
    const maxLookbackDays = timeframe === 'M' ? Math.max(limit * 31, 800) : timeframe === 'W' ? Math.max(limit * 8, 320) : Math.max(limit * 3, 450);
    const targetRecords = timeframe === 'M' ? limit * 22 : timeframe === 'W' ? limit * 5 : limit;
    const candidateDates: string[] = [];

    for (let offset = 0; offset < maxLookbackDays; offset += 1) {
        const current = addDays(today, -offset);
        const weekday = current.getUTCDay();
        if (weekday === 0 || weekday === 6) continue;
        candidateDates.push(formatDateId(current));
    }

    const batchSize = 20;
    for (let index = 0; index < candidateDates.length; index += batchSize) {
        const batch = candidateDates.slice(index, index + batchSize);
        const batchRecords = await Promise.all(batch.map((dateId) => fetchDailyRecord(baseDir, baseSymbol, dateId)));
        for (const record of batchRecords) {
            if (record) records.push(record);
        }
        if (records.length >= targetRecords) break;
    }

    const candles = records
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((record) => {
            const value = metricValue(record, metric);
            const openTime = dateIdToOpenTime(record.date);
            return {
                openTime,
                closeTime: openTime + 86400000,
                open: value,
                high: value,
                low: value,
                close: value,
                volume: record.totalVolume,
            } satisfies Candle;
        });

    const aggregated = aggregateSyntheticCandles(candles, timeframe);
    return aggregated.slice(-limit);
}

export function resolveFinraFieldName(expression: unknown, data: Record<string, unknown>) {
    const entries = [
        ['open', data.open],
        ['high', data.high],
        ['low', data.low],
        ['close', data.close],
        ['volume', data.volume],
    ] as const;
    for (const [name, ref] of entries) {
        if (expression === ref) return name;
    }
    return null;
}

export function inferFinraFieldFromParam(
    paramValues: unknown[] | undefined,
    data: Record<string, { data?: unknown[] }>,
) {
    if (!Array.isArray(paramValues) || paramValues.length === 0) return null;
    const candidates = ['open', 'high', 'low', 'close', 'volume'] as const;

    for (const field of candidates) {
        const source = Array.isArray(data[field]?.data) ? data[field].data : [];
        const sampleSize = Math.min(paramValues.length, source.length, 8);
        if (sampleSize === 0) continue;

        let matches = true;
        for (let index = 0; index < sampleSize; index += 1) {
            if (paramValues[index] !== source[index]) {
                matches = false;
                break;
            }
        }

        if (matches) return field;
    }

    return null;
}

export function alignSecondaryValue(
    primaryOpenTime: number,
    primaryCloseTime: number,
    secondaryCandles: Candle[],
    field: 'open' | 'high' | 'low' | 'close' | 'volume',
) {
    for (let index = secondaryCandles.length - 1; index >= 0; index -= 1) {
        const candle = secondaryCandles[index];
        if (candle.openTime <= primaryOpenTime && primaryOpenTime < candle.closeTime) {
            return candle[field];
        }
        if (candle.closeTime <= primaryCloseTime && candle.openTime <= primaryOpenTime) {
            return candle[field];
        }
    }
    return Number.NaN;
}
