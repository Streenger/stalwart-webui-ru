/*
 * Экспорт списка в CSV (идея из форка LinkPhoenix/stalwart-webui-fork).
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-SEL
 */

import { buildCsv, downloadCsv } from '@/lib/csvExport';
import { formatSize } from '@/lib/durationFormat';
import { evaluateFetchAllTotal, FETCH_ALL_HARD_CAP, probeQueryTotal } from '@/lib/fetchAllGuardrails';
import { getReportSummaryValue, isReportSummaryColumn } from '@/lib/reportSummaries';
import { getAccountId } from '@/services/jmap/client';
import { jmapQueryAllAndGet } from '@/services/jmap/legacy';
import type { Column } from '@/types/schema';
import { COUNT_COLUMN_SOURCES, QUOTA_USAGE_COLUMN, computeQuotaUsage, countColumnValue, fetchProperties } from './syntheticColumns';

type Item = Record<string, unknown>;

function cellText(column: string, item: Item): string {
  if (column === QUOTA_USAGE_COLUMN) {
    const { used, limit } = computeQuotaUsage(item);
    return `${formatSize(used)} / ${limit ? formatSize(limit) : '∞'}`;
  }
  if (column in COUNT_COLUMN_SOURCES) return String(countColumnValue(column, item));
  if (isReportSummaryColumn(column)) return String(getReportSummaryValue(column, item));
  const value = item[column];
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export async function exportListCsv(params: {
  objectName: string;
  columns: Column[];
  filter?: Record<string, unknown>;
  sort?: Record<string, unknown>[];
  filename: string;
  clientRows?: Item[];
}): Promise<void> {
  const { objectName, columns, filter, sort, filename, clientRows } = params;
  let rows = clientRows;
  if (!rows) {
    const accountId = getAccountId(objectName);
    const check = evaluateFetchAllTotal(await probeQueryTotal(objectName, accountId, { filter, sort }));
    if (!check.ok) {
      throw new Error(
        `Слишком много строк для экспорта: ${check.total} (лимит ${FETCH_ALL_HARD_CAP}). Сузьте фильтры.`,
      );
    }
    rows = (await jmapQueryAllAndGet(objectName, accountId, { filter, sort }, fetchProperties(columns))).list;
  }
  const csv = buildCsv(
    columns.map((c) => c.label),
    rows.map((item) => columns.map((c) => cellText(c.name, item))),
  );
  const date = new Date().toISOString().slice(0, 10);
  downloadCsv(`${filename}-${date}.csv`, csv);
}
