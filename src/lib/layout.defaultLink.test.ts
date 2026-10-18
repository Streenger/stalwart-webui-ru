/*
 * SPDX-FileCopyrightText: 2020 Stalwart Labs LLC <hello@stalw.art>
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-SEL
 */

import { describe, expect, it } from 'vitest';
import type { Layout, Schema } from '@/types/schema';
import { findPreferredDefaultLinkInLayout } from '@/lib/layout';

function schemaWithLinks(): Schema {
  return {
    objects: {},
    schemas: {},
    fields: {},
    forms: {},
    lists: {},
    enums: {},
    layouts: [],
  };
}

describe('findPreferredDefaultLinkInLayout', () => {
  const layout: Layout = {
    name: 'Management',
    icon: 'home',
    items: [
      { link: { name: 'Dashboard', icon: 'gauge', viewName: 'CustomComponent/Dashboard' } },
      { link: { name: 'Getting Started', icon: 'rocket', viewName: 'CustomComponent/Onboarding' } },
      { link: { name: 'Overview', icon: 'panels-top-left', viewName: 'CustomComponent/Overview' } },
      { link: { name: 'Domains', icon: 'globe', viewName: 'x:Domain' } },
    ],
  };

  it('prefers Overview when Dashboard is not accessible (community)', () => {
    const schema = schemaWithLinks();
    // CustomComponent/* is visible; Dashboard is enterprise → inaccessible on community
    const link = findPreferredDefaultLinkInLayout(schema, layout, 'community', () => true, () => false);
    expect(link).toBe('CustomComponent/Overview');
  });
});
