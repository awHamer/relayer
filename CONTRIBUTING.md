# Contributing to Relayer

## Setup

```bash
git clone https://github.com/awHamer/relayer
cd relayer
pnpm install
```

## Development

```bash
pnpm build        # build all packages
pnpm dev          # watch mode
pnpm typecheck    # TypeScript check
pnpm lint         # ESLint
pnpm test         # run tests
```

## Making changes

1. Fork the repo and create a branch: `feat/your-feature` or `fix/your-fix`
2. Make your changes
3. Add a changeset:
   ```bash
   pnpm changeset
   ```
   Select the affected packages and the change type (`patch` / `minor` / `major`).
4. Make sure CI passes: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`
5. Open a PR

## Running integration tests

Integration tests require running databases. You can use Docker:

```bash
# PostgreSQL
docker run -d -p 5433:5432 -e POSTGRES_USER=relayer -e POSTGRES_PASSWORD=relayer -e POSTGRES_DB=relayer_test postgres:16

# MySQL
docker run -d -p 3307:3306 -e MYSQL_USER=relayer -e MYSQL_PASSWORD=relayer -e MYSQL_DATABASE=relayer_test -e MYSQL_ROOT_PASSWORD=root mysql:8
```

Then run:

```bash
pnpm --filter @relayerjs/drizzle test:pg
pnpm --filter @relayerjs/drizzle test:mysql
pnpm --filter @relayerjs/drizzle test:sqlite
```

## Release process

Releases are automated via Changesets. When a PR with a changeset is merged to `main`, a bot opens a "Version Packages" PR. Once that PR is merged, packages are published to npm automatically.
