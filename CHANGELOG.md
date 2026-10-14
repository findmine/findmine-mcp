# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - Unreleased

### Changed
- Migrated from `@modelcontextprotocol/sdk` 1.x to the MCP TypeScript SDK v2 (`@modelcontextprotocol/server` 2.3.x) and Zod 4
- The stdio bin now uses `serveStdio`, which serves protocol revisions 2025-11-25 and 2026-07-28 from one server factory
- Tools, resources, and prompts are registered with `registerTool` / `registerResource` / `registerPrompt`; Zod schemas in `src/tools/schemas.ts` are the single source for tool inputs and outputs
- Every tool declares a `title`, all four annotation hints (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`), and an `outputSchema`, and returns `structuredContent` with a text summary
- Upstream failures return `isError` tool results; reading an unknown resource URI returns a resource-not-found protocol error
- Prompt arguments are declared and honored: `outfit_completion` (`product_id`, optional `product_color_id`, `occasion`) and `styling_guide` (optional `category`, `occasion`, `fashion_season`)
- Server info reports name `findmine-mcp`, title `FindMine`, the package version, a website URL, and model-facing `instructions`
- Resource URIs percent-encode product and look IDs so any ID round-trips
- Requires Node.js 20 or later

### Added
- `createFindMineDeps()` and `createFindMineServer(deps, { extend })` in `src/server.ts` for embedding and extending the server
- In-process integration tests covering both protocol revisions, and tool schema unit tests

### Removed
- `api_version` and `force_enable` tool inputs (use `FINDMINE_API_VERSION` and the `FINDMINE_ENABLE_*` environment variables)
- The `NODE_ENV=development` startup pre-warm, which called the live API with sample IDs
- Unused `node-fetch` dependency

## [0.2.0] - 2025-12-03

### Changed
- Upgraded MCP SDK from 0.6.0 to 1.24.2
- Added tool annotations (readOnlyHint, destructiveHint, openWorldHint)
- Added Zod input validation for all tools
- Refactored monolithic index.ts into modular components

### Added
- Vitest testing infrastructure with unit tests
- ESLint (flat config) + Prettier for code quality
- GitHub Actions CI/CD pipeline
- CHANGELOG.md

## [0.1.1] - Previous release
- Initial MCP server implementation
