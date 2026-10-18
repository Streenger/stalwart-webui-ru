/*
 * SPDX-FileCopyrightText: 2020 Stalwart Labs LLC <hello@stalw.art>
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-SEL
 */

import { getBasePath } from '@/lib/basePath';

const CIMD_DOCUMENT_NAME = 'oauth-client.json';
// Форк: совместимость с Stalwart 0.16, где клиент OAuth зарегистрирован под этим идентификатором.
const DEFAULT_CLIENT_ID = 'stalwart-webui';

interface ClientIdSources {
  envClientId: string | undefined;
  metaClientId: string | null;
  cimdSupported: boolean;
  origin: string;
  basePath: string;
}

function cimdClientId(origin: string, basePath: string): string {
  const segments = basePath.split('/').filter((segment) => segment.length > 0);
  return [origin.replace(/\/+$/, ''), ...segments, CIMD_DOCUMENT_NAME].join('/');
}

function chooseOAuthClientId(sources: ClientIdSources): string | null {
  const env = sources.envClientId?.trim();
  if (env) return env;
  if (sources.metaClientId) return sources.metaClientId;
  if (sources.cimdSupported) return cimdClientId(sources.origin, sources.basePath);
  return DEFAULT_CLIENT_ID;
}

function getMetaClientId(): string | null {
  const content = document.querySelector('meta[name="oauth-client-id"]')?.getAttribute('content')?.trim();
  return content ? content : null;
}

export function resolveOAuthClientId(cimdSupported: boolean): string | null {
  return chooseOAuthClientId({
    envClientId: import.meta.env.VITE_OAUTH_CLIENT_ID as string | undefined,
    metaClientId: getMetaClientId(),
    cimdSupported,
    origin: window.location.origin,
    basePath: getBasePath(),
  });
}
