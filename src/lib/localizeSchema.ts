/*
 * SPDX-FileCopyrightText: 2026 Streenger <https://github.com/Streenger>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/*
 * Russian localization layer for the server-provided schema.
 *
 * The Stalwart server describes every form, list, field and enum in English inside
 * `/api/schema`. This module replaces those strings with Russian ones (looked up in
 * `src/i18n/schema-ru.json`, keyed by the exact English text) and applies
 * Russian regional defaults. Anything missing from the dictionary stays in English.
 */

import type { Schema } from '@/types/schema';

type Dict = Record<string, string>;

// Keys whose string values are human-readable text.
const TEXT_KEYS = new Set([
  'label',
  'title',
  'subtitle',
  'description',
  'explanation',
  'keyLabel',
  'singularName',
  'pluralName',
]);

// Enums that are technical identifiers or generated programmatically.
const SKIP_ENUMS = new Set(['Locale', 'TimeZone']);

// Russian regional defaults, applied to form defaults.
export const RU_FIELD_DEFAULTS: Record<string, Record<string, unknown>> = {
  'x:UserAccount': { locale: 'ru-RU', timeZone: 'Europe/Moscow' },
  'x:GroupAccount': { locale: 'ru-RU', timeZone: 'Europe/Moscow' },
  'x:AccountSettings': { locale: 'ru-RU', timeZone: 'Europe/Moscow' },
  'x:Search': { defaultLanguage: 'ru-RU', supportedLanguages: { 'ru-RU': true, 'en-US': true } },
};

let dictPromise: Promise<Dict> | null = null;

function loadDict(): Promise<Dict> {
  dictPromise ??= import('@/i18n/schema-ru.json').then((m) => (m.default ?? m) as Dict);
  return dictPromise;
}

let layoutLabels: Dict = {};

/** Display name of a top-level layout (Management, Settings, Account); falls back to the original. */
export function layoutLabel(name: string): string {
  return layoutLabels[name] ?? name;
}

function translateDeep(value: unknown, dict: Dict, key?: string): unknown {
  if (typeof value === 'string') {
    return key && TEXT_KEYS.has(key) ? (dict[value] ?? value) : value;
  }
  if (Array.isArray(value)) return value.map((v) => translateDeep(v, dict, key));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = translateDeep(v, dict, k);
    return out;
  }
  return value;
}

function translateNav(items: unknown[], dict: Dict): unknown[] {
  return items.map((it) => {
    const item = { ...(it as Record<string, unknown>) };
    for (const kind of ['link', 'container'] as const) {
      const node = item[kind] as Record<string, unknown> | undefined;
      if (node) {
        const copy = { ...node };
        if (typeof copy.name === 'string') copy.name = dict[copy.name] ?? copy.name;
        if (Array.isArray(copy.items)) copy.items = translateNav(copy.items, dict);
        item[kind] = copy;
      }
    }
    if (typeof item.type === 'string' && typeof item.name === 'string') {
      item.name = dict[item.name] ?? item.name;
      if (Array.isArray(item.items)) item.items = translateNav(item.items as unknown[], dict);
    }
    return item;
  });
}

function localeLabel(code: string, fallback: string): string {
  try {
    const m = /^([a-z]{2,3})(?:-([A-Za-z0-9]+))?/.exec(code);
    if (!m) return fallback;
    const lang = new Intl.DisplayNames(['ru'], { type: 'language' }).of(m[1]);
    if (!lang || lang === m[1]) return fallback;
    const label = lang.charAt(0).toUpperCase() + lang.slice(1);
    if (m[2]) {
      const region = new Intl.DisplayNames(['ru'], { type: 'region' }).of(m[2].toUpperCase());
      if (region && region !== m[2].toUpperCase()) return `${label} (${region})`;
    }
    return label;
  } catch {
    return fallback;
  }
}

function timeZoneLabel(name: string, fallback: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZone: name, timeZoneName: 'longOffset' }).formatToParts(
      new Date(),
    );
    const off = parts.find((p) => p.type === 'timeZoneName')?.value.replace('GMT', 'UTC') ?? '';
    return off ? `${name} (${off === 'UTC' ? 'UTC+00:00' : off})` : fallback;
  } catch {
    return fallback;
  }
}

/** Returns a Russian copy of the schema. Never throws: on failure the original schema is returned. */
export async function localizeSchema(schema: Schema): Promise<Schema> {
  try {
    const dict = await loadDict();
    const out: Record<string, unknown> = { ...schema };

    for (const part of ['objects', 'schemas', 'fields', 'forms', 'lists'] as const) {
      out[part] = translateDeep(schema[part], dict);
    }

    const enums: Record<string, unknown> = {};
    for (const [name, variants] of Object.entries(schema.enums)) {
      if (name === 'Locale') {
        enums[name] = variants.map((v) => ({ ...v, label: localeLabel(v.name, v.label) }));
      } else if (name === 'TimeZone') {
        enums[name] = variants.map((v) => ({ ...v, label: timeZoneLabel(v.name, v.label) }));
      } else if (SKIP_ENUMS.has(name)) {
        enums[name] = variants;
      } else {
        enums[name] = translateDeep(variants, dict);
      }
    }
    out.enums = enums;

    layoutLabels = {};
    out.layouts = schema.layouts.map((layout) => {
      layoutLabels[layout.name] = dict[layout.name] ?? layout.name;
      return { ...layout, items: translateNav(layout.items as unknown[], dict) };
    });

    // Russian regional defaults for forms.
    const fields = out.fields as Schema['fields'];
    for (const [fieldsName, defaults] of Object.entries(RU_FIELD_DEFAULTS)) {
      const entry = fields[fieldsName];
      if (entry) entry.defaults = { ...(entry.defaults ?? {}), ...defaults };
    }

    return out as unknown as Schema;
  } catch {
    return schema;
  }
}
