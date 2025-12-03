# FindMine MCP Development Guide

## Build & Development Commands

### Build and Watch
- `npm run build` - Build the project
- `npm run watch` - Watch for changes and rebuild
- `npm run typecheck` - Run TypeScript type checking
- `npm run inspector` - Run MCP inspector for testing
- `NODE_ENV=development npm run build && node build/index.js` - Run with sample data

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
- Tests located in `__tests__/` directories alongside source files
- Aim for high coverage on utility functions and business logic
- Use descriptive test names: `it('should return formatted product when valid data provided')`
- Mock external dependencies (API calls, file system)

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
- All tool inputs validated with **Zod schemas** in `src/schemas/tool-inputs.ts`
- Define schemas before implementing tools
- Use discriminated unions for complex inputs
- Return proper error responses for validation failures

## MCP Protocol Compliance
- Built with **MCP SDK 1.24.2** (spec version 2025-11-25)
- All tools include proper annotations:
  - `readOnlyHint` - Tools that don't modify state
  - `destructiveHint` - Tools that modify or delete data
  - `openWorldHint` - Tools with unbounded output
- Follow MCP error response format for all failures

## Repository Structure
```
src/
├── index.ts              # MCP server bootstrap (entry point)
├── config.ts             # Environment configuration
├── api/                  # FindMine API client
│   └── findmine-client.ts
├── handlers/             # MCP protocol handlers
│   ├── tools.ts          # Tool execution handlers
│   ├── resources.ts      # Resource handlers
│   └── prompts.ts        # Prompt handlers
├── tools/                # Tool definitions with MCP annotations
│   └── index.ts
├── schemas/              # Zod validation schemas
│   ├── tool-inputs.ts    # Input validation for all tools
│   └── index.ts
├── content/              # Static content
│   └── style-guides.ts   # Style guide content
├── prompts/              # Prompt definitions
│   ├── findmine-help.ts
│   ├── outfit-completion.ts
│   ├── styling-guide.ts
│   └── index.ts
├── services/             # Business logic layer
│   └── findmine-service.ts
├── types/                # TypeScript type definitions
│   ├── findmine-api.ts
│   └── mcp.ts
└── utils/                # Utility functions and helpers
    ├── cache.ts
    ├── formatters.ts
    ├── logger.ts
    ├── mock-data.ts
    └── resource-mapper.ts
```

## Architecture Principles
- **Separation of concerns**: Handlers, tools, schemas, and business logic are separated
- **Modular design**: Each directory has a single, clear responsibility
- **Type safety**: Strict TypeScript with comprehensive type definitions
- **Input validation**: All external inputs validated with Zod
- **Error handling**: Consistent error responses across all handlers
- **Testability**: Pure functions where possible, mockable dependencies