/*
 * Дополнительные элементы списков из форка LinkPhoenix/stalwart-webui-fork:
 * настройка столбцов, пресеты и автообновление журнала, переключатель «только проблемы»,
 * подсказки очереди доставки. Адаптировано под архитектуру 2.0.0.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-SEL
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Columns3, RefreshCw, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import type { ColumnPreferences } from './useColumnPreferences';
import {
  deleteLogFilterPreset,
  listLogFilterPresets,
  saveLogFilterPreset,
  type LogFilterPreset,
} from '@/lib/logFilterPresets';
import type { QueueOpsLink } from '@/lib/queueOpsLinks';

const REFRESH_COOLDOWN_MS = 5000;
const LOG_AUTO_REFRESH_MS = 10_000;

export function ColumnMenu({ columns }: { columns: ColumnPreferences }) {
  const { t } = useTranslation();
  const { ordered, visible, prefs } = columns;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={t('list.customizeColumns', 'Customize columns')}>
          <Columns3 className="mr-2 h-4 w-4" aria-hidden />
          {t('list.columns', 'Columns')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[70vh] overflow-y-auto">
        {ordered.map((column) => {
          const hidden = prefs.hidden.includes(column.name);
          return (
            <DropdownMenuCheckboxItem
              key={column.name}
              checked={!hidden}
              disabled={!hidden && visible.length <= 1}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) => columns.setHidden(column.name, !checked)}
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          );
        })}
        <DropdownMenuSeparator />
        {visible.map((column, index) => (
          <DropdownMenuSub key={`order-${column.name}`}>
            <DropdownMenuSubTrigger>{column.label}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem disabled={index === 0} onSelect={() => columns.move(column.name, -1)}>
                <ChevronUp aria-hidden />
                {t('list.moveColumnEarlier', 'Move earlier')}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={index === visible.length - 1} onSelect={() => columns.move(column.name, 1)}>
                <ChevronDown aria-hidden />
                {t('list.moveColumnLater', 'Move later')}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Кнопка обновления с паузой между нажатиями и автообновлением (для журнала). */
export function RefreshControls({
  onRefresh,
  autoRefreshEnabled,
  canAutoRefresh,
  loading,
}: {
  onRefresh: () => void;
  autoRefreshEnabled: boolean;
  /** Автообновление разрешено только на первой странице. */
  canAutoRefresh: boolean;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const [cooldown, setCooldown] = useState(false);
  const [auto, setAuto] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const refresh = useCallback(() => {
    if (cooldown) return;
    setCooldown(true);
    onRefresh();
    timer.current = setTimeout(() => setCooldown(false), REFRESH_COOLDOWN_MS);
  }, [cooldown, onRefresh]);

  useEffect(() => {
    if (!autoRefreshEnabled || !auto || !canAutoRefresh || loading) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') refresh();
    }, LOG_AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [autoRefreshEnabled, auto, canAutoRefresh, loading, refresh]);

  return (
    <div className="flex items-center gap-3">
      {autoRefreshEnabled && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={auto} onCheckedChange={setAuto} />
          {t('list.autoRefresh', 'Auto-refresh')}
        </label>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={refresh}
        disabled={cooldown || loading}
        title={cooldown ? t('list.refreshCooldown', 'Wait a few seconds before refreshing again') : undefined}
      >
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
        {t('list.refresh', 'Refresh')}
      </Button>
    </div>
  );
}

export function ProblemsOnlySwitch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  const { t } = useTranslation();
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <Switch checked={checked} onCheckedChange={onChange} />
      {t('list.problemsOnly', 'Problems only')}
    </label>
  );
}

/** Сохранённые наборы фильтров журнала. */
export function LogFilterPresets({
  applied,
  disabled,
  onApply,
}: {
  applied: Record<string, string>;
  disabled: boolean;
  onApply: (filters: Record<string, string>) => void;
}) {
  const { t } = useTranslation();
  const [presets, setPresets] = useState<LogFilterPreset[]>(() => listLogFilterPresets());
  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="sm" disabled={disabled}>
            {t('list.filterPresets', 'Presets')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {presets.length === 0 ? (
            <DropdownMenuItem disabled>{t('list.filterPresetsEmpty', 'No saved presets')}</DropdownMenuItem>
          ) : (
            presets.map((preset) => (
              <DropdownMenuItem key={preset.id} onSelect={() => onApply(preset.filters)} className="justify-between gap-4">
                <span>{preset.name}</span>
                <button
                  type="button"
                  aria-label={t('list.filterPresetDelete', 'Delete preset')}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteLogFilterPreset(preset.id);
                    setPresets(listLogFilterPresets());
                  }}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || Object.keys(applied).length === 0}
        onClick={() => {
          const name = window.prompt(t('list.filterPresetNamePrompt', 'Name for this filter preset'));
          if (!name?.trim()) return;
          saveLogFilterPreset(name, applied);
          setPresets(listLogFilterPresets());
        }}
      >
        {t('list.filterPresetSave', 'Save preset')}
      </Button>
    </div>
  );
}

function OpsLinks({ links, asButtons }: { links: QueueOpsLink[]; asButtons?: boolean }) {
  const { t } = useTranslation();
  if (links.length === 0) return null;
  return (
    <div className={`mt-2 flex flex-wrap gap-3 ${asButtons ? 'justify-center' : ''}`}>
      {links.map((link) =>
        asButtons ? (
          <Button key={link.viewName} asChild size="sm" variant="outline">
            <Link to={link.href}>{t(link.labelKey[0], link.labelKey[1])}</Link>
          </Button>
        ) : (
          <Link key={link.viewName} to={link.href} className="text-primary underline hover:text-primary/80">
            {t(link.labelKey[0], link.labelKey[1])}
          </Link>
        ),
      )}
    </div>
  );
}

export function QueueBacklogNotice({ total, links }: { total: number; links: QueueOpsLink[] }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <p className="font-medium">
        {t('list.queueBacklogTitle', '{{count}} messages waiting in the queue', { count: total })}
      </p>
      <p className="mt-1 text-muted-foreground">
        {t('list.queueBacklogBody', 'Use Delivery Trace or Log Entries to investigate stuck or delayed mail.')}
      </p>
      <OpsLinks links={links} />
    </div>
  );
}

export function QueueEmptyState({ links }: { links: QueueOpsLink[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-1">
      <p>{t('list.queueEmptyTitle', 'The delivery queue is empty')}</p>
      <p className="max-w-sm text-xs">
        {t('list.queueEmptyBody', 'No messages are waiting. If mail is delayed, check Delivery Trace or Log Entries.')}
      </p>
      <OpsLinks links={links} asButtons />
    </div>
  );
}
