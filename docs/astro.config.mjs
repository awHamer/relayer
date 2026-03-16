// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

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
				{ label: 'Roadmap', slug: 'roadmap' },
			],
		}),
	],
});
