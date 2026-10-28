import { describe, expect, it } from 'vitest';
import { localizeSchema } from './localizeSchema';
import { buildCreateDefaults, resolveView } from './schemaResolver';
import type { Schema } from '@/types/schema';

const enumOf = (...names: string[]) => names.map((name) => ({ name, label: name }));

const schema = {
  objects: {
    'x:Account': { type: 'object', objectName: 'x:Account', objectType: { type: 'collection' } },
  },
  schemas: {
    'x:Account': { type: 'multiple', variants: [{ name: 'User', label: 'User', schemaName: 'x:UserAccount' }] },
    'x:UserRoles': { type: 'multiple', variants: [{ name: 'User', label: 'User' }, { name: 'Admin', label: 'Admin' }] },
    'x:Permissions': { type: 'multiple', variants: [{ name: 'Inherit', label: 'Inherit' }] },
  },
  fields: {
    'x:UserAccount': {
      defaults: { locale: 'en-US' },
      properties: {
        locale: { type: { type: 'enum', enumName: 'Locale' }, update: 'mutable' },
        timeZone: { type: { type: 'enum', enumName: 'TimeZone', nullable: true }, update: 'mutable' },
        roles: { type: { type: 'object', objectName: 'x:UserRoles' }, update: 'mutable' },
        permissions: { type: { type: 'object', objectName: 'x:Permissions' }, update: 'mutable' },
      },
    },
  },
  forms: {},
  lists: {},
  layouts: [],
  enums: { Locale: enumOf('en-US', 'ru-RU'), TimeZone: enumOf('Europe/Moscow') },
} as unknown as Schema;

describe('localizeSchema: значения по умолчанию для нового пользователя', () => {
  it('ru-RU, Europe/Moscow, роль User и права Inherit', async () => {
    const localized = await localizeSchema(schema);
    const view = resolveView(localized, 'x:Account');
    expect(view).not.toBeNull();
    const data = buildCreateDefaults(localized, view!.object, view!.resolvedSchema, 'User');
    expect(data.locale).toBe('ru-RU');
    expect(data.timeZone).toBe('Europe/Moscow');
    expect(data.roles).toEqual({ '@type': 'User' });
    expect(data.permissions).toEqual({ '@type': 'Inherit' });
  });
});
