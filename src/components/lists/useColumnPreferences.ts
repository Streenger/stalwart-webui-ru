/*
 * Порядок и видимость столбцов списка (идея из форка LinkPhoenix/stalwart-webui-fork).
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-SEL
 */

import { useCallback, useState } from 'react';

import { moveListColumn, parseListColumnPreferences, type ListColumnPreferences } from '@/lib/listColumnPreferences';
import type { Column } from '@/types/schema';

function readPreferences(viewName: string): ListColumnPreferences {
  try {
    return parseListColumnPreferences(localStorage.getItem(`list-columns:${viewName}`));
  } catch {
    return { order: [], hidden: [] };
  }
}

/** Порядок и видимость столбцов, запоминаются в браузере отдельно для каждого раздела. */
export function useColumnPreferences(viewName: string, columns: Column[]) {
  const [state, setState] = useState(() => ({ viewName, value: readPreferences(viewName) }));
  const prefs = state.viewName === viewName ? state.value : readPreferences(viewName);

  const save = useCallback(
    (next: ListColumnPreferences) => {
      setState({ viewName, value: next });
      try {
        localStorage.setItem(`list-columns:${viewName}`, JSON.stringify(next));
      } catch {
        // Хранилище недоступно: настройки действуют до перезагрузки страницы.
      }
    },
    [viewName],
  );

  const byName = new Map(columns.map((c) => [c.name, c]));
  const ordered = [
    ...prefs.order.flatMap((name) => (byName.has(name) ? [byName.get(name)!] : [])),
    ...columns.filter((c) => !prefs.order.includes(c.name)),
  ];
  const visible = ordered.filter((c) => !prefs.hidden.includes(c.name));
  const shown = visible.length > 0 ? visible : ordered;

  return {
    ordered,
    visible: shown,
    prefs,
    setHidden: (name: string, hidden: boolean) =>
      save({
        ...prefs,
        order: prefs.order.length ? prefs.order : ordered.map((c) => c.name),
        hidden: hidden ? [...prefs.hidden, name] : prefs.hidden.filter((n) => n !== name),
      }),
    move: (name: string, direction: -1 | 1) =>
      save({ ...prefs, order: moveListColumn(shown.map((c) => c.name), name, direction) }),
  };
}


export type ColumnPreferences = ReturnType<typeof useColumnPreferences>;
