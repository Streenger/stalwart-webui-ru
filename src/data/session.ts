/*
 * SPDX-FileCopyrightText: 2020 Stalwart Labs LLC <hello@stalw.art>
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-SEL
 */

import { useQuery } from '@tanstack/react-query';
import { sessionKeys } from '@/data/keys';
import { fetchAccountInfo, fetchSchema, fetchSession, type JmapSession } from '@/services/jmap/client';
import { useAuthStore } from '@/stores/authStore';
import { useSchemaStore } from '@/stores/schemaStore';
import { useAccountStore } from '@/stores/accountStore';
import { setLocale } from '@/i18n';
import { localizeSchema } from '@/lib/localizeSchema';
import { withClientLogFilters } from '@/lib/logFilters';
import { withAccountListColumns } from '@/lib/accountColumns';
import { withMailingListColumns } from '@/lib/mailingListColumns';
import { withRoleListColumns } from '@/lib/roleColumns';
import { withDomainColumns } from '@/lib/domainColumns';
import { withReportListColumns } from '@/lib/reportColumns';
import {
  withDirectoryColumns,
  withDnsServerColumns,
  withNetworkListenerColumns,
  withWebhookColumns,
} from '@/lib/operationsListColumns';

export interface SessionInfo {
  accounts: Record<string, { name: string; isPersonal: boolean }>;
  primaryAccountId: string;
  apiUrl: string;
  maxObjectsInGet?: number;
  maxObjectsInSet?: number;
}

export function parseSession(session: JmapSession): SessionInfo {
  const accounts: SessionInfo['accounts'] = {};
  for (const [accountId, info] of Object.entries(session.accounts ?? {})) {
    accounts[accountId] = { name: info.name, isPersonal: info.isPersonal };
  }
  const primaryAccounts = session.primaryAccounts ?? {};
  const primaryAccountId =
    primaryAccounts['urn:ietf:params:jmap:core'] ?? Object.values(primaryAccounts)[0] ?? Object.keys(accounts)[0];
  if (!primaryAccountId) {
    throw new Error('The JMAP session does not contain any account');
  }
  const core = session.capabilities?.['urn:ietf:params:jmap:core'];
  return {
    accounts,
    primaryAccountId,
    apiUrl: session.apiUrl || '/jmap',
    maxObjectsInGet: typeof core?.maxObjectsInGet === 'number' ? core.maxObjectsInGet : undefined,
    maxObjectsInSet: typeof core?.maxObjectsInSet === 'number' ? core.maxObjectsInSet : undefined,
  };
}

export async function initializeSession(signal?: AbortSignal): Promise<true> {
  const [session, rawSchema, account] = await Promise.all([
    fetchSession(signal),
    fetchSchema(signal),
    fetchAccountInfo(signal),
  ]);
  const info = parseSession(session);
  // Russian fork: translate the server-provided schema and apply Russian regional defaults.
  const schema = await localizeSchema(
    // Столбцы и фильтры списков из форка LinkPhoenix/stalwart-webui-fork.
    withReportListColumns(
      withDomainColumns(
        withRoleListColumns(
          withMailingListColumns(
            withAccountListColumns(
              withNetworkListenerColumns(
                withDnsServerColumns(withDirectoryColumns(withWebhookColumns(withClientLogFilters(rawSchema)))),
              ),
            ),
          ),
        ),
      ),
    ),
  );

  useAuthStore
    .getState()
    .setSession(info.accounts, info.primaryAccountId, info.apiUrl, info.maxObjectsInGet, info.maxObjectsInSet);
  useSchemaStore.getState().setSchema(schema);
  useAccountStore.getState().setAccountInfo(account.permissions, account.edition, account.locale);
  // Russian fork: the admin interface is Russian by default; set localStorage 'stalwart.ui.lang' = 'en' to override.
  setLocale(window.localStorage.getItem('stalwart.ui.lang') ?? 'ru');
  return true;
}

export function useSessionInit() {
  return useQuery({
    queryKey: sessionKeys.init,
    queryFn: ({ signal }) => initializeSession(signal),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
  });
}
