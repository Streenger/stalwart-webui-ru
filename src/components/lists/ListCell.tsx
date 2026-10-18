/*
 * SPDX-FileCopyrightText: 2020 Stalwart Labs LLC <hello@stalw.art>
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-SEL
 */

import { FieldValue, VariantValue } from '@/components/values/FieldValue';
import { EmptyValue } from '@/components/values/ScalarValues';
import type { Field, Schema } from '@/types/schema';
import { SizeDisplay } from '@/components/common/SizeDisplay';
import { ReportSummaryCell } from '@/components/lists/ReportSummaryCell';
import { formatSize } from '@/lib/durationFormat';
import { isReportSummaryColumn } from '@/lib/reportSummaries';
import { scalarText } from './listQuery';
import { COUNT_COLUMN_SOURCES, QUOTA_USAGE_COLUMN, computeQuotaUsage, countColumnValue } from './syntheticColumns';
import { useTranslation } from 'react-i18next';
import { CornerDownRight } from 'lucide-react';

interface ListCellProps {
  schema: Schema;
  objectName: string;
  column: string;
  field: Field | undefined;
  value: unknown;
}

interface ListCellProps2 extends ListCellProps {
  item?: Record<string, unknown>;
  /** Глубина вложенности для названия почтового ящика. */
  depth?: number;
}

function QuotaUsage({ item }: { item: Record<string, unknown> }) {
  const { t } = useTranslation();
  const { used, limit } = computeQuotaUsage(item);
  const limitLabel = limit ? formatSize(limit) : t('list.unlimitedQuota', '∞');
  const text =
    used >= 0 ? (
      `${formatSize(used)} / ${limitLabel}`
    ) : (
      <span className="inline-flex items-center gap-1.5">
        <SizeDisplay bytes={used} />
        <span className="text-muted-foreground">/</span>
        <span>{limitLabel}</span>
      </span>
    );
  if (used < 0 || limit <= 0) return <>{text}</>;
  const percent = Math.min(100, (used / limit) * 100);
  const barColor = percent >= 90 ? 'bg-destructive' : percent >= 70 ? 'bg-amber-500' : 'bg-green-600';
  return (
    <div className="flex min-w-[8rem] flex-col gap-1">
      <span>{text}</span>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('list.quotaUsagePercent', 'Quota used')}
      >
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function ListCell({ schema, objectName, column, field, value, item, depth }: ListCellProps2) {
  if (item) {
    if (depth !== undefined && column === 'name') {
      return (
        <div style={{ paddingLeft: depth * 20 }} className="flex items-center gap-1.5">
          {depth > 0 && <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />}
          <span>{String(item.name ?? '')}</span>
        </div>
      );
    }
    if (column === QUOTA_USAGE_COLUMN) return <QuotaUsage item={item} />;
    if (column in COUNT_COLUMN_SOURCES) return <>{countColumnValue(column, item)}</>;
    if (isReportSummaryColumn(column)) return <ReportSummaryCell colName={column} item={item} />;
  }
  if (field) return <FieldValue schema={schema} type={field.type} value={value} variant="compact" />;
  if (column === '@type' && typeof value === 'string' && value) {
    return <VariantValue schema={schema} objectName={objectName} value={value} />;
  }
  const text = scalarText(value);
  return text ? <>{text}</> : <EmptyValue variant="compact" />;
}
