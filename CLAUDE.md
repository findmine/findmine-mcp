# FindMine MCP Development Guide

## Build & Development Commands
- `npm run build` - Build the project
- `npm run watch` - Watch for changes and rebuild
- `npm run inspector` - Run MCP inspector for testing
- `NODE_ENV=development npm run build && node build/index.js` - Run with sample data

## Code Style Guidelines
- **Imports**: Group by source (external first, then local with .js extension)
- **Types**: Use interfaces with descriptive names, explicit return types, optional props with '?'
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces
- **Formatting**: 2 space indentation, descriptive names, JSDoc for documentation
- **Error Handling**: Try-catch blocks with specific error messages, defensive programming
- **Functions**: Use async/await, options pattern for multiple parameters
- **TypeScript**: Strict mode enabled, ES2022 target, Node16 module resolution

## Repository Structure
- `src/index.ts` - Main MCP server implementation
- `src/api/` - FindMine API client
- `src/services/` - Business logic layer
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions and helpers