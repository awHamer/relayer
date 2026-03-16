# @relayerjs/core

ORM-agnostic types and contracts for [Relayer](../../README.md).

## What's inside

- **FieldType** enum (`Computed`, `Derived`)
- **Operator interfaces** — `StringOperators`, `NumberOperators`, `BooleanOperators`, `DateOperators`, `ArrayOperators`, `RelationOperators`
- **Field definitions** — `ScalarFieldDef`, `RelationFieldDef`, `ComputedFieldDef`, `DerivedFieldDef`
- **Entity registry** — `EntityRegistry`, `EntityMetadata`
- **Query option types** — `FindManyOptions`, `FindFirstOptions`, `CountOptions`, `CreateOptions`, `UpdateOptions`, `DeleteOptions`, `MutationResult`
- **Value types** — `ValueType`, `ScalarValueType`, `ObjectValueType`

## Usage

This package is typically not imported directly. The main adapter package (`@relayerjs/drizzle`) re-exports everything you need:

```ts
import { FieldType } from '@relayerjs/drizzle';
```

If you're building a custom adapter or need core types directly:

```ts
import { FieldType, EntityRegistry } from '@relayerjs/core';
import type { StringOperators, ComputedFieldDef } from '@relayerjs/core';
```

## License

[MIT](../../LICENSE)
