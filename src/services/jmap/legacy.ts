/*
 * Совместимые обёртки для кода, перенесённого из форка LinkPhoenix/stalwart-webui-fork.
 * Этот код вызывает JMAP с прежней сигнатурой (objectType, accountId, ...);
 * здесь она сводится к API версии 2.0.0 из client.ts.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-SEL
 */

import {
  jmapGetBatched as getBatched,
  jmapQuery as query,
  jmapQueryAllAndGet as queryAllAndGet,
  jmapRequest,
  type JmapObject,
  type JmapQueryOptions,
} from '@/services/jmap/client';
import type { JmapMethodResponse } from '@/types/jmap';

export { jmapRequest };

export async function jmapQuery(
  objectType: string,
  accountId: string,
  options: JmapQueryOptions = {},
): Promise<JmapMethodResponse[]> {
  const result = await query(objectType, options, { accountId });
  return [[`${objectType}/query`, result as unknown as Record<string, unknown>, '0']] as JmapMethodResponse[];
}

export function jmapQueryAllAndGet(
  objectType: string,
  accountId: string,
  queryOptions: JmapQueryOptions = {},
  properties?: string[],
  signal?: AbortSignal,
): Promise<{ ids: string[]; list: JmapObject[] }> {
  return queryAllAndGet(objectType, queryOptions, properties, { accountId, signal });
}

export function jmapGetBatched(
  objectType: string,
  accountId: string,
  ids: string[],
  properties?: string[],
  signal?: AbortSignal,
): Promise<JmapObject[]> {
  return getBatched(objectType, ids, properties, { accountId, signal });
}
