# FindMine MCP Development Guide

## Build & Development Commands

### Build and Watch
- `npm run build` - Build the project
- `npm run watch` - Watch for changes and rebuild
- `npm run typecheck` - Run TypeScript type checking
- `npm run inspector` - Run MCP inspector for testing

### Testing (Vitest)
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once (useful for CI)
- `npm run test:coverage` - Run tests with coverage report

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Pre-commit Checklist
Run all checks before committing:
```bash
npm run typecheck && npm run lint && npm run format:check && npm run test:run
```

## Testing Guidelines
- Tests use **Vitest** framework
- Tests live in `tests/unit/` and `tests/integration/` (in-process server via `createMcpHandler` + v2 `Client`, both protocol eras)
- Aim for high coverage on utility functions and business logic
- Use descriptive test names: `it('should return formatted product when valid data provided')`
- Replace the FindMine API at the `deps` boundary with a fake (`tests/fakes/`) instead of global mocks

## Code Style Guidelines
- **Imports**: Group by source (external first, then local with .js extension)
- **Types**: Use interfaces with descriptive names, explicit return types, optional props with '?'
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces
- **Formatting**: 2 space indentation, descriptive names, JSDoc for documentation
- **Error Handling**: Try-catch blocks with specific error messages, defensive programming
- **Functions**: Use async/await, options pattern for multiple parameters
- **TypeScript**: Strict mode enabled, ES2022 target, Node16 module resolution
- **Linting**: Follow ESLint rules (flat config with TypeScript support)
- **Formatting**: Prettier enforces consistent formatting

## Input Validation
- Tool input **and output** schemas are **Zod 4** schemas in `src/tools/schemas.ts` — the single source of truth (the SDK derives the advertised JSON Schema, validates arguments, and validates `structuredContent`)
- Define schemas before implementing tools
- Use discriminated unions for complex inputs
- Arguments that fail the input schema come back from the SDK as `isError` tool results; prompt arguments are validated from `argsSchema`

## MCP Protocol Compliance
- Built on the **MCP TypeScript SDK v2** (`@modelcontextprotocol/server` 2.3.x, Zod 4, Node >= 20)
- `src/index.ts` serves stdio with `serveStdio(factory)`, which negotiates protocol 2025-11-25 (`initialize`) or 2026-07-28 (`server/discover`) per connection
- `createFindMineServer(deps)` in `src/server.ts` is the per-connection factory; `createFindMineDeps()` builds config, client, and service once
- Every tool registers with `title`, a Zod `outputSchema`, and all four annotations:
  - `readOnlyHint` - Tool does not modify state
  - `destructiveHint` - Tool may overwrite or delete data
  - `idempotentHint` - Repeating the call with the same arguments has no further effect
  - `openWorldHint` - Tool calls the external FindMine API
- Tools return `structuredContent` matching their `outputSchema`, plus a text summary and the serialized JSON
- Business failures (upstream errors) return `{ isError: true, content }` — never throw; unknown resource URIs throw `ResourceNotFoundError`

## Repository Structure
```
src/
├── index.ts              # stdio bin (serveStdio)
├── server.ts             # createFindMineDeps() + createFindMineServer(deps, { extend })
├── config.ts             # loadConfig(env): environment configuration
├── api/                  # FindMine API client
│   └── findmine-client.ts
├── tools/                # One file per tool + shared pieces
│   ├── schemas.ts        # Zod input and output schemas (single source of truth)
│   ├── register.ts       # Registers tools; write tools are feature-flagged
│   ├── results.ts        # Result builders and ProductRef mapping
│   ├── get-style-guide.ts
│   ├── get-complete-the-look.ts
│   ├── get-visually-similar.ts
│   ├── track-interaction.ts
│   └── update-item-details.ts
├── resources/            # product:/// and look:/// resource templates
│   ├── register.ts
│   └── uris.ts           # URI and MIME helpers
├── prompts/              # Prompts with Zod argsSchema
│   ├── register.ts
│   ├── findmine-help.ts
│   ├── outfit-completion.ts
│   └── styling-guide.ts
├── content/              # Static content
│   └── style-guides.ts   # Style guide categories and content
├── services/             # Business logic layer (caching, resource store)
│   └── findmine-service.ts
├── types/                # TypeScript type definitions
│   ├── findmine-api.ts
│   └── mcp.ts
└── utils/                # Utility functions and helpers
    ├── cache.ts
    ├── formatters.ts
    ├── logger.ts
    └── resource-mapper.ts
tests/
├── unit/                 # Schema, cache, formatter tests
├── integration/          # In-process server tests (both protocol eras)
└── fakes/                # Fake FindMine API injected via deps
```

## Architecture Principles
- **Separation of concerns**: Tools, resources, prompts, schemas, and business logic are separated
- **Modular design**: Each directory has a single, clear responsibility
- **Type safety**: Strict TypeScript with comprehensive type definitions
- **Input validation**: All external inputs validated with Zod
- **Error handling**: `isError` tool results for business failures; protocol errors for resources and prompts
- **Testability**: Pure functions where possible; dependencies injected through `createFindMineDeps`