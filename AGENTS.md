# Repository Guidelines

## Project Structure & Module Organization

This Next.js 16 CRM uses React, TypeScript, Tailwind CSS, shadcn/ui, Zustand, and Prisma/SQLite. `src/app/` contains the application shell and API routes; CRM screens live in `src/components/crm/` and reusable primitives in `src/components/ui/`. Shared utilities, auth, database access, and state are in `src/lib/`; hooks are in `src/hooks/`. Prisma files are in `prisma/`, scripts in `scripts/`, and static files in `public/`.

## Build, Test, and Development Commands

- `bun run dev` — run the local Next.js server on port 3000.
- `bun run lint` — run the repository ESLint configuration.
- `npx tsc --noEmit` — type-check explicitly; the Next.js build is configured to ignore build-time type errors.
- `bun run build` — create the standalone production build.
- `bun run db:generate` / `bun run db:push` — regenerate Prisma client or apply schema changes to the configured database.
- `bun run bootstrap:admin` — create the initial administrator when needed.

Use Bun for routine commands; keep both lockfiles consistent when dependencies change.

## Coding Style & Naming Conventions

Write TypeScript and functional React components. Follow existing four-space indentation and single-quoted imports. Use `kebab-case.tsx` CRM filenames (for example, `lead-detail-page.tsx`), PascalCase components, camelCase code, and existing Prisma field names (`first_name`, `assigned_to_id`). Keep code/comments in English and user-facing strings in Persian. Reuse `src/components/ui` and `src/lib/utils.ts` before adding helpers.

## Testing Guidelines

There is no automated test runner. For every change, run `bun run lint` and `npx tsc --noEmit`, then exercise the affected UI or API path. Add focused tests with future test infrastructure; name them `*.test.ts` or `*.test.tsx`. Validate role-specific behavior with representative accounts.

## API, Database, and Security

API routes must use `getSession`, enforce role/department scope server-side, and log mutations with `logActivity`. Do not rely on client-side navigation for authorization. Treat `DEMO_AUTH` as development-only. Review Prisma changes carefully and use `db:push` for the current schema workflow.

## Commit & Pull Request Guidelines

Use concise Conventional Commit-style subjects, such as `fix(auth): reject expired sessions` or `perf: add lead indexes`. Keep commits focused. Pull requests should describe the user-visible change, note schema/auth impact, link issues when available, include UI screenshots, and list validation run.
