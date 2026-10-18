/*
 * Синтетические столбцы списков и клиентская сортировка/фильтрация.
 * Идея и логика перенесены из форка LinkPhoenix/stalwart-webui-fork
 * (SCHEMA-DEVIATION: account-quota-usage-column, account-alias-count-column,
 * role-permission-count-columns, report-summary-columns, account-client-sort,
 * log-client-filters), адаптированы под архитектуру 2.0.0.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-SEL
 */

import { getReportSummaryValue, isReportSummaryColumn, listNeedsReportProperty } from '@/lib/reportSummaries';
import { isClientOnlyFilterEnum, isClientSortableColumn } from '@/lib/schemaDeviationTypes';
import type { Column, Filter, List } from '@/types/schema';

type Item = Record<string, unknown>;

/** Столбец «количество»: имя столбца -> реальное свойство-множество на сервере. */
export const COUNT_COLUMN_SOURCES: Record<string, string> = {
  aliasCount: 'aliases',
  enabledPermissionCount: 'enabledPermissions',
  disabledPermissionCount: 'disabledPermissions',
};

export const QUOTA_USAGE_COLUMN = 'quotaUsage';

export function isSyntheticColumn(name: string): boolean {
  return name === QUOTA_USAGE_COLUMN || name in COUNT_COLUMN_SOURCES || isReportSummaryColumn(name);
}

/** Реальные свойства JMAP для набора (возможно синтетических) столбцов. */
export function fetchProperties(columns: Array<{ name: string }>, options: { mailbox?: boolean } = {}): string[] {
  const properties: string[] = ['id'];
  const add = (name: string) => {
    if (!properties.includes(name)) properties.push(name);
  };
  for (const { name } of columns) {
    if (name === QUOTA_USAGE_COLUMN) {
      add('usedDiskQuota');
      add('quotas');
    } else if (name in COUNT_COLUMN_SOURCES) add(COUNT_COLUMN_SOURCES[name]);
    else if (isReportSummaryColumn(name)) add('report');
    else add(name);
  }
  if (listNeedsReportProperty(columns)) add('report');
  if (options.mailbox) add('parentId');
  return properties;
}

export function isClientOnlyFilter(filter: Filter): boolean {
  return filter.type === 'enum' && isClientOnlyFilterEnum(filter);
}

export function clientSortableNames(list: Pick<List, 'columns'>): Set<string> {
  return new Set(list.columns.filter(isClientSortableColumn).map((c: Column) => c.name));
}

export function computeQuotaUsage(item: Item): { used: number; limit: number } {
  const rawUsed = typeof item.usedDiskQuota === 'number' ? item.usedDiskQuota : 0;
  const quotas = item.quotas as Record<string, unknown> | undefined;
  const rawLimit = quotas && typeof quotas.maxDiskQuota === 'number' ? quotas.maxDiskQuota : 0;
  return {
    used: Number.isFinite(rawUsed) ? rawUsed : 0,
    limit: Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 0,
  };
}

export function countColumnValue(column: string, item: Item): number {
  const source = COUNT_COLUMN_SOURCES[column];
  return Object.keys((item[source] as Record<string, unknown>) ?? {}).length;
}

export function clientSortValue(column: string, item: Item): string | number {
  if (column in COUNT_COLUMN_SOURCES) return countColumnValue(column, item);
  if (isReportSummaryColumn(column)) return getReportSummaryValue(column, item);
  if (column === QUOTA_USAGE_COLUMN) return computeQuotaUsage(item).used;
  const raw = item[column];
  return typeof raw === 'number' ? raw : String(raw ?? '');
}

export function sortClientItems(items: Item[], column: string, ascending: boolean): Item[] {
  const direction = ascending ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = clientSortValue(column, a);
    const bv = clientSortValue(column, b);
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return cmp * direction;
  });
}

export function applyClientFilters(items: Item[], active: Array<{ field: string; value: string }>): Item[] {
  if (active.length === 0) return items;
  return items.filter((item) => active.every((f) => String(item[f.field] ?? '') === f.value));
}

/**
 * Почтовые ящики: родитель располагается перед потомками (братья по алфавиту),
 * для каждой строки запоминается глубина. Нужен полный набор строк, так как родитель
 * может оказаться на другой странице (SCHEMA-DEVIATION: mailbox-client-hierarchy-sort).
 */
export function sortMailboxesByHierarchy(items: Item[]): { items: Item[]; depths: Map<string, number> } {
  const ids = new Set(items.map((item) => item.id as string));
  const childrenOf = new Map<string, Item[]>();
  const roots: Item[] = [];
  for (const item of items) {
    const parentId = item.parentId as string | null | undefined;
    if (parentId && ids.has(parentId)) {
      const siblings = childrenOf.get(parentId) ?? [];
      siblings.push(item);
      childrenOf.set(parentId, siblings);
    } else {
      roots.push(item);
    }
  }
  const byName = (a: Item, b: Item) => String(a.name ?? '').localeCompare(String(b.name ?? ''));
  roots.sort(byName);
  for (const siblings of childrenOf.values()) siblings.sort(byName);
  const ordered: Item[] = [];
  const depths = new Map<string, number>();
  const visit = (item: Item, depth: number) => {
    ordered.push(item);
    depths.set(item.id as string, depth);
    for (const child of childrenOf.get(item.id as string) ?? []) visit(child, depth + 1);
  };
  for (const root of roots) visit(root, 0);
  return { items: ordered, depths };
}
