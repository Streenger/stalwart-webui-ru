/*
 * SPDX-FileCopyrightText: 2020 Stalwart Labs LLC <hello@stalw.art>
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-SEL
 */

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';

import { useJmapList } from '@/data/objects';
import { jmapKeys } from '@/data/keys';
import { evaluateFetchAllTotal, FETCH_ALL_HARD_CAP, probeQueryTotal } from '@/lib/fetchAllGuardrails';
import { jmapQueryAllAndGet } from '@/services/jmap/legacy';
import { getAccountId } from '@/services/jmap/client';
import { errorMessage } from '@/lib/jmapErrors';
import { useUIStore } from '@/stores/uiStore';
import { JmapMethodError } from '@/services/errors';
import type { List } from '@/types/schema';
import {
  buildListFilter,
  buildListPageParams,
  buildListSort,
  clientSortField,
  effectiveSort,
  isStrandedPage,
  itemId,
  pageRange,
  type ListItem,
  type PageRange,
} from './listQuery';
import {
  applyClientFilters,
  fetchProperties,
  isClientOnlyFilter,
  sortClientItems,
} from './syntheticColumns';
import { listStateKey, nextSort, parseListSearch, serializeListSearch, type ListUrlState } from './listUrlState';

const EMPTY_ITEMS: ListItem[] = [];
const EMPTY_LIST: Pick<List, 'filters' | 'filtersStatic' | 'columns' | 'sort'> = { columns: [] };

export interface DynamicListState {
  state: ListUrlState;
  stateKey: string;
  items: ListItem[];
  total: number | null;
  range: PageRange;
  jmapFilter: Record<string, unknown> | undefined;
  jmapSort: Record<string, unknown>[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  /** Список загружен целиком и отсортирован/отфильтрован в браузере. */
  clientMode: boolean;
  /** Все строки в клиентском режиме (для экспорта). */
  clientRows: ListItem[];
  pageSize: number;
  error: string | null;
  applyFilters: (filters: Record<string, string>) => void;
  resetFilters: () => void;
  toggleSort: (field: string) => void;
  nextPage: () => void;
  prevPage: () => void;
  refetch: () => void;
}

export function useDynamicList(
  objectName: string | undefined,
  list: List | null | undefined,
  labelProperty?: string,
): DynamicListState {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = parseListSearch(searchParams);
  const stateKey = listStateKey(state);
  const effectiveList = list ?? EMPTY_LIST;
  const enabledObject = list && objectName ? objectName : null;

  const pageSize = useUIStore((s) => s.listPageSize);
  const sortColumn = clientSortField(state.sort, effectiveList);
  const activeClientFilters = (effectiveList.filters ?? [])
    .filter(isClientOnlyFilter)
    .map((f) => ({ field: 'field' in f ? f.field : '', value: state.filters[('field' in f ? f.field : '') as string] ?? '' }))
    .filter((f) => f.field && f.value !== '');
  const clientMode = Boolean(enabledObject) && (sortColumn !== null || activeClientFilters.length > 0);

  const query = useJmapList(
    clientMode ? null : enabledObject,
    buildListPageParams(state, effectiveList, objectName ?? '', pageSize, labelProperty),
    { keepPrevious: true },
  );

  const serverFilter = buildListFilter(state.filters, effectiveList, objectName ?? '');
  const properties = fetchProperties(effectiveList.columns);
  if (labelProperty && !properties.includes(labelProperty)) properties.push(labelProperty);
  const clientQuery = useQuery({
    queryKey: [
      ...jmapKeys.lists(objectName ?? ''),
      'client',
      { filter: serverFilter ?? null, properties, sort: state.sort?.field, asc: state.sort?.ascending, activeClientFilters },
    ],
    enabled: clientMode && !!objectName,
    staleTime: 0,
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const accountId = getAccountId(objectName!);
      const fetchAll = { filter: serverFilter, sort: sortColumn ? undefined : buildListSort(effectiveSort(state.sort, effectiveList)) };
      const total = evaluateFetchAllTotal(await probeQueryTotal(objectName!, accountId, fetchAll));
      if (!total.ok) {
        throw new Error(
          `Слишком много строк для загрузки в браузер: ${total.total} (лимит ${FETCH_ALL_HARD_CAP}). Сузьте фильтры.`,
        );
      }
      const { list } = await jmapQueryAllAndGet(objectName!, accountId, fetchAll, properties);
      let matched = applyClientFilters(list, activeClientFilters);
      if (sortColumn) matched = sortClientItems(matched, sortColumn, state.sort?.ascending ?? true);
      return matched;
    },
  });

  const active = clientMode ? clientQuery : query;

  const anchorLost =
    !clientMode &&
    state.anchors.length > 0 &&
    query.error instanceof JmapMethodError &&
    query.error.type === 'anchorNotFound' &&
    !query.isFetching;

  const stranded =
    !clientMode &&
    isStrandedPage(
      state.anchors.length,
      query.data?.list.length ?? 0,
      query.isSuccess && !query.isPlaceholderData && !query.isFetching,
    );
  const recovery = anchorLost ? 'reset' : stranded ? 'back' : null;

  useEffect(() => {
    if (!recovery) return;
    const current = parseListSearch(searchParams);
    const anchors = recovery === 'reset' ? [] : current.anchors.slice(0, -1);
    setSearchParams(serializeListSearch({ ...current, anchors }), { replace: true });
  }, [recovery, searchParams, setSearchParams]);

  const navigateTo = (next: ListUrlState) => {
    const params = serializeListSearch(next);
    if (params.toString() === stateKey) void active.refetch();
    else setSearchParams(params);
  };

  // В клиентском режиме номер страницы равен числу «якорей» в адресе.
  const clientAll = clientQuery.data ?? EMPTY_ITEMS;
  const clientPage = Math.min(state.anchors.length, Math.max(0, Math.ceil(clientAll.length / pageSize) - 1));
  const items = clientMode
    ? clientAll.slice(clientPage * pageSize, (clientPage + 1) * pageSize)
    : (query.data?.list ?? EMPTY_ITEMS);
  const total = clientMode ? (clientQuery.data ? clientAll.length : null) : (query.data?.total ?? null);
  const position = clientMode ? clientPage * pageSize : (query.data?.position ?? 0);

  return {
    state,
    stateKey,
    items,
    total,
    range: clientMode
      ? {
          from: items.length > 0 ? clientPage * pageSize + 1 : 0,
          to: clientPage * pageSize + items.length,
          hasPrev: clientPage > 0,
          hasNext: (clientPage + 1) * pageSize < clientAll.length,
        }
      : pageRange(position, items.length, total, state.anchors.length, pageSize),
    jmapFilter: buildListFilter(state.filters, effectiveList, objectName ?? ''),
    jmapSort: buildListSort(effectiveSort(state.sort, effectiveList)),
    isLoading: active.isPending && active.fetchStatus !== 'idle',
    isFetching: active.isFetching,
    clientMode,
    clientRows: clientAll,
    pageSize,
    error: active.isError && !anchorLost ? errorMessage(active.error) : null,
    applyFilters: (filters) => navigateTo({ filters, sort: state.sort, anchors: [] }),
    resetFilters: () => navigateTo({ filters: {}, sort: null, anchors: [] }),
    toggleSort: (field) => navigateTo({ filters: state.filters, sort: nextSort(state.sort, field), anchors: [] }),
    nextPage: () => {
      if (clientMode) {
        navigateTo({ ...state, anchors: [...state.anchors, String(state.anchors.length + 1)] });
        return;
      }
      const last = items.length > 0 ? itemId(items[items.length - 1]) : null;
      if (last) navigateTo({ ...state, anchors: [...state.anchors, last] });
    },
    prevPage: () => {
      if (state.anchors.length > 0) navigateTo({ ...state, anchors: state.anchors.slice(0, -1) });
    },
    refetch: () => void active.refetch(),
  };
}
