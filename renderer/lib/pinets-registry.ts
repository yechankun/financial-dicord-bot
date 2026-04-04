import fs from 'node:fs/promises';
import path from 'node:path';

import type { DataSource } from '../src/types';

export type ScriptReferenceKind = 'preset' | 'custom';

export type ScriptReference = {
    kind: ScriptReferenceKind;
    id: string;
};

export type CustomScriptRecord = {
    id: string;
    label: string;
    description?: string;
    file: string;
    createdAt: string;
    updatedAt: string;
};

export type ChartProfile = {
    id: string;
    label: string;
    description?: string;
    items: ScriptReference[];
    defaults?: {
        source?: DataSource;
        symbol?: string;
        timeframe?: string;
        limit?: number;
    };
    createdAt: string;
    updatedAt: string;
};

export type PinetsRegistry = {
    version: 1;
    scripts: CustomScriptRecord[];
    profiles: ChartProfile[];
};

export const PINETS_DIR = '.pinets';
export const PINETS_SCRIPTS_DIR = path.join(PINETS_DIR, 'scripts');
export const PINETS_REGISTRY_PATH = path.join(PINETS_DIR, 'registry.json');

const EMPTY_REGISTRY: PinetsRegistry = {
    version: 1,
    scripts: [],
    profiles: [],
};

function invariant(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

export function normalizeId(value: string) {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    invariant(normalized, 'A non-empty id is required.');
    return normalized;
}

export function getRegistryPaths(baseDir = process.cwd()) {
    const rootDir = path.resolve(baseDir, PINETS_DIR);
    return {
        rootDir,
        scriptsDir: path.join(rootDir, 'scripts'),
        registryPath: path.join(rootDir, 'registry.json'),
    };
}

async function ensureRegistryDirs(baseDir = process.cwd()) {
    const paths = getRegistryPaths(baseDir);
    await fs.mkdir(paths.scriptsDir, { recursive: true });
    return paths;
}

export async function readRegistry(baseDir = process.cwd()): Promise<PinetsRegistry> {
    const { registryPath } = getRegistryPaths(baseDir);
    try {
        const raw = await fs.readFile(registryPath, 'utf8');
        const parsed = JSON.parse(raw) as PinetsRegistry;
        return {
            version: 1,
            scripts: Array.isArray(parsed.scripts) ? parsed.scripts : [],
            profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
        };
    } catch (error) {
        if ((error as { code?: string }).code === 'ENOENT') {
            return structuredClone(EMPTY_REGISTRY);
        }
        throw error;
    }
}

export async function writeRegistry(baseDir: string, registry: PinetsRegistry) {
    const { registryPath } = await ensureRegistryDirs(baseDir);
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2) + '\n', 'utf8');
}

export async function readCustomScriptCode(baseDir: string, id: string) {
    const registry = await readRegistry(baseDir);
    const normalizedId = normalizeId(id);
    const record = registry.scripts.find((item) => item.id === normalizedId);
    invariant(record, `Custom script not found: ${normalizedId}`);
    const scriptPath = path.resolve(baseDir, record.file);
    const code = await fs.readFile(scriptPath, 'utf8');
    return { record, code, scriptPath };
}

export async function upsertCustomScript(
    baseDir: string,
    options: {
        id: string;
        label?: string;
        description?: string;
        code: string;
    },
) {
    const registry = await readRegistry(baseDir);
    const paths = await ensureRegistryDirs(baseDir);
    const now = new Date().toISOString();
    const id = normalizeId(options.id);
    const existing = registry.scripts.find((item) => item.id === id);
    const relativeFile = path.join(PINETS_SCRIPTS_DIR, `${id}.pine`);
    const absoluteFile = path.join(paths.rootDir, 'scripts', `${id}.pine`);

    await fs.writeFile(absoluteFile, options.code.trimEnd() + '\n', 'utf8');

    const record: CustomScriptRecord = existing
        ? {
              ...existing,
              label: options.label?.trim() || existing.label,
              description: options.description ?? existing.description,
              file: relativeFile,
              updatedAt: now,
          }
        : {
              id,
              label: options.label?.trim() || id,
              description: options.description,
              file: relativeFile,
              createdAt: now,
              updatedAt: now,
          };

    registry.scripts = [...registry.scripts.filter((item) => item.id !== id), record].sort((a, b) => a.id.localeCompare(b.id));
    await writeRegistry(baseDir, registry);
    return { record, absoluteFile };
}

export async function deleteCustomScript(baseDir: string, id: string) {
    const registry = await readRegistry(baseDir);
    const normalizedId = normalizeId(id);
    const record = registry.scripts.find((item) => item.id === normalizedId);
    invariant(record, `Custom script not found: ${normalizedId}`);

    registry.scripts = registry.scripts.filter((item) => item.id !== normalizedId);
    registry.profiles = registry.profiles.map((profile) => ({
        ...profile,
        items: profile.items.filter((item) => !(item.kind === 'custom' && item.id === normalizedId)),
        updatedAt: new Date().toISOString(),
    }));

    await writeRegistry(baseDir, registry);
    const scriptPath = path.resolve(baseDir, record.file);
    await fs.rm(scriptPath, { force: true });
    return record;
}

export async function upsertProfile(
    baseDir: string,
    options: {
        id: string;
        label?: string;
        description?: string;
        items: ScriptReference[];
        defaults?: ChartProfile['defaults'];
    },
) {
    const registry = await readRegistry(baseDir);
    const id = normalizeId(options.id);
    invariant(options.items.length > 0, 'A profile must contain at least one script reference.');
    const now = new Date().toISOString();
    const existing = registry.profiles.find((item) => item.id === id);

    const profile: ChartProfile = existing
        ? {
              ...existing,
              label: options.label?.trim() || existing.label,
              description: options.description ?? existing.description,
              items: options.items,
              defaults: options.defaults ?? existing.defaults,
              updatedAt: now,
          }
        : {
              id,
              label: options.label?.trim() || id,
              description: options.description,
              items: options.items,
              defaults: options.defaults,
              createdAt: now,
              updatedAt: now,
          };

    registry.profiles = [...registry.profiles.filter((item) => item.id !== id), profile].sort((a, b) => a.id.localeCompare(b.id));
    await writeRegistry(baseDir, registry);
    return profile;
}

export async function deleteProfile(baseDir: string, id: string) {
    const registry = await readRegistry(baseDir);
    const normalizedId = normalizeId(id);
    const profile = registry.profiles.find((item) => item.id === normalizedId);
    invariant(profile, `Chart profile not found: ${normalizedId}`);
    registry.profiles = registry.profiles.filter((item) => item.id !== normalizedId);
    await writeRegistry(baseDir, registry);
    return profile;
}

export function parseScriptReferenceList(value: string) {
    const items = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    invariant(items.length > 0, 'At least one profile item is required.');

    return items.map((item) => {
        const [kind, rawId] = item.split(':', 2);
        invariant(rawId, `Invalid profile item '${item}'. Use preset:<id> or custom:<id>.`);
        invariant(kind === 'preset' || kind === 'custom', `Invalid profile item kind '${kind}'.`);
        return {
            kind,
            id: normalizeId(rawId),
        } as ScriptReference;
    });
}
