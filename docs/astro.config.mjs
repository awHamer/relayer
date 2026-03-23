// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'Relayer',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/awHamer/relayer',
        },
      ],
      sidebar: [
        { label: 'Introduction', slug: 'index' },
        { label: 'Getting Started', slug: 'getting-started' },
        {
          label: 'Fields',
          items: [
            { label: 'Computed Fields', slug: 'computed-fields' },
            { label: 'Derived Fields', slug: 'derived-fields' },
          ],
        },
        {
          label: 'Querying',
          items: [
            { label: 'Basic Queries', slug: 'querying' },
            { label: 'Operators', slug: 'operators' },
            { label: 'JSON Filtering', slug: 'json-filtering' },
            { label: 'Relations', slug: 'relations' },
            { label: 'Relation Filters', slug: 'relation-filters' },
            { label: 'Aggregations', slug: 'aggregations' },
          ],
        },
        {
          label: 'Mutations & Transactions',
          items: [
            { label: 'Mutations', slug: 'mutations' },
            { label: 'Transactions', slug: 'transactions' },
          ],
        },
        {
          label: 'Advanced',
          items: [
            { label: 'Context', slug: 'context' },
            { label: 'Type Utilities', slug: 'type-utilities' },
            { label: 'Multi-Dialect Support', slug: 'multi-dialect' },
            { label: 'Escape Hatch', slug: 'escape-hatch' },
          ],
        },
        {
          label: '@relayerjs/next',
          items: [
            { label: 'Getting Started', slug: 'next/getting-started' },
            { label: 'Route Handlers', slug: 'next/route-handlers' },
            { label: 'Configuration', slug: 'next/configuration' },
            { label: 'Hooks', slug: 'next/hooks' },
            { label: 'Auth Patterns', slug: 'next/auth-patterns' },
            { label: 'SSR Direct Call', slug: 'next/ssr' },
            { label: 'Server Actions', slug: 'next/server-actions' },
            { label: 'Standalone Schemas', slug: 'next/standalone-schemas' },
            { label: 'Response Format', slug: 'next/response-format' },
          ],
        },
        {
          label: '@relayerjs/nestjs-crud',
          items: [
            { label: 'Getting Started', slug: 'nestjs/getting-started' },
            { label: 'Search & Filtering', slug: 'nestjs/search-and-filtering' },
            { label: 'Configuration', slug: 'nestjs/configuration' },
            { label: 'Validation', slug: 'nestjs/validation' },
            { label: 'DTO Mapper', slug: 'nestjs/dto-mapper' },
            { label: 'Hooks', slug: 'nestjs/hooks' },
            { label: 'Decorators & Guards', slug: 'nestjs/decorators' },
            { label: 'Dependency Injection', slug: 'nestjs/dependency-injection' },
            { label: 'Known Limitations', slug: 'nestjs/limitations' },
          ],
        },
        { label: 'Roadmap', slug: 'roadmap' },
      ],
    }),
  ],
});
