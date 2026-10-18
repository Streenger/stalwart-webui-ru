/*
 * SPDX-FileCopyrightText: 2020 Stalwart Labs LLC <hello@stalw.art>
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-SEL
 */

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PageRange } from './listQuery';

interface PaginationProps {
  range: PageRange;
  total: number | null;
  count: number;
  pluralName: string;
  disabled: boolean;
  onPrev: () => void;
  onNext: () => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

export function Pagination({ range, total, count, pluralName, disabled, onPrev, onNext, pageSize, onPageSizeChange }: PaginationProps) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('list.pagination', 'Pagination')}
      className="flex items-center justify-between text-sm text-muted-foreground"
    >
      <p aria-live="polite">
        {total !== null
          ? t('list.showing', 'Showing {{from}}-{{to}} of {{total}} {{name}}', {
              from: range.from,
              to: range.to,
              total,
              name: pluralName,
            })
          : t('list.showingItems', 'Showing {{count}} items', { count })}
      </p>
      <div className="flex items-center gap-2">
        {pageSize && onPageSizeChange && (
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))} disabled={disabled}>
            <SelectTrigger className="h-9 w-[5.5rem]" aria-label={t('list.pageSize', 'Rows per page')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100, 200].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" size="sm" disabled={!range.hasPrev || disabled} onClick={onPrev}>
          {t('list.previous', 'Previous')}
        </Button>
        <Button variant="outline" size="sm" disabled={!range.hasNext || disabled} onClick={onNext}>
          {t('list.next', 'Next')}
        </Button>
      </div>
    </nav>
  );
}
