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
export function fetchProperties(columns: Array<{ name: string }>): string[] {
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
