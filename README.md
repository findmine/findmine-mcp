# FindMine Shopping Stylist

A Model Context Protocol (MCP) server that integrates FindMine's powerful product styling and outfitting recommendations with Claude and other MCP-compatible applications.

## Overview

This MCP server connects to FindMine's styling API and exposes its functionality to Large Language Models through the Model Context Protocol. It allows users to:

- Browse product and outfit information
- Get outfit recommendations for specific products
- Find visually similar products
- Access style guidance and fashion advice

## Features

### Resources
- **Products**: Detailed product information with `product:///` URI scheme
- **Looks**: Complete outfit recommendations with `look:///` URI scheme

### Tools
- **get_style_guide**: Access detailed fashion advice and styling guidelines
- **get_complete_the_look**: Get outfit recommendations for a product
- **get_visually_similar**: Find visually similar products
- **track_interaction**: Record shopper interactions (only when `FINDMINE_ENABLE_TRACKING=true`)
- **update_item_details**: Update item stock and sale status (only when `FINDMINE_ENABLE_ITEM_UPDATES=true`)

Every tool declares a title, behavior annotations, and an output schema, and returns structured results.

### Prompts
- **outfit_completion**: Get styling advice for complete outfits
- **styling_guide**: Access comprehensive fashion styling guidelines
- **findmine_help**: Learn how to use FindMine's tools and resources

## Installation

### Option 1: Install from npm

```bash
# Install and run directly (recommended)
npx findmine-mcp

# Or install globally
npm install -g findmine-mcp
findmine-mcp
```

### Option 2: Run with Docker

```bash
docker run -e FINDMINE_APP_ID=your_app_id findmine/mcp-server:latest
```

### Option 3: Clone and build from source

```bash
# Clone the repository
git clone https://github.com/findmine/findmine-mcp.git
cd findmine-mcp

# Install dependencies
npm install

# Build the server
npm run build

# For development with auto-rebuild
npm run watch
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FINDMINE_API_URL` | FindMine API base URL | https://api.findmine.com |
| `FINDMINE_APP_ID` | Your FindMine application ID | DEMO_APP_ID |
| `FINDMINE_API_VERSION` | API version to use | v3 |
| `FINDMINE_DEFAULT_REGION` | Default region code | us |
| `FINDMINE_DEFAULT_LANGUAGE` | Default language code | en |
| `FINDMINE_CACHE_ENABLED` | Enable response caching | true |
| `FINDMINE_CACHE_TTL_MS` | Cache time-to-live in ms | 3600000 (1 hour) |
| `FINDMINE_ENABLE_TRACKING` | Register the `track_interaction` tool | false |
| `FINDMINE_ENABLE_ITEM_UPDATES` | Register the `update_item_details` tool | false |
| `FINDMINE_DEBUG` | Log debug output to stderr | false |

## Usage with Claude Desktop

Installation does not change any Claude Desktop settings. Add the server to `claude_desktop_config.json` yourself (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`), pointing at your build:

```json
{
  "mcpServers": {
    "findmine": {
      "command": "node",
      "args": ["/absolute/path/to/findmine-mcp/build/index.js"],
      "env": { "FINDMINE_APP_ID": "your_app_id" }
    }
  }
}
```

## Development

### Available Scripts

```bash
# Build and watch
npm run build              # Build the project
npm run watch             # Watch for changes and rebuild
npm run typecheck         # Run TypeScript type checking

# Testing
npm test                  # Run tests in watch mode
npm run test:run          # Run tests once
npm run test:coverage     # Run tests with coverage report

# Code quality
npm run lint              # Run ESLint
npm run lint:fix          # Run ESLint with auto-fix
npm run format            # Format code with Prettier
npm run format:check      # Check code formatting

# Development tools
npm run inspector         # Run MCP inspector (http://localhost:5173)
```

### Testing

This project uses Vitest for testing. Tests live in `tests/unit/` and `tests/integration/`; the integration suite drives the server in-process with the MCP SDK v2 client on both supported protocol revisions.

```bash
# Run tests in watch mode
npm test

# Run tests once (useful for CI)
npm run test:run

# Generate coverage report
npm run test:coverage
```

### Code Quality

Before committing code:

```bash
# Run all checks
npm run typecheck && npm run lint && npm run format:check && npm run test:run
```

The project uses:
- **ESLint** for linting with TypeScript support
- **Prettier** for code formatting
- **Vitest** for testing
- **GitHub Actions** for CI/CD

### Customizing the Style Guide

The style guide can be customized to match your brand's specific styling philosophies and fashion guidance. To customize the style guide:

1. Locate the style guides in `src/content/style-guides.ts`
2. Modify the content for each category (`general`, `color_theory`, `body_types`, etc.)
3. Add new categories by adding the name to `STYLE_GUIDE_CATEGORIES` and its content to the `styleGuides` object (the tool and prompt schemas pick up the new category automatically)
4. Customize occasion-specific and seasonal advice

Example of adding a custom style guide category:

```typescript
// In src/content/style-guides.ts (after adding 'your_brand_style' to STYLE_GUIDE_CATEGORIES)
export const styleGuides: Record<StyleGuideCategory, string> = {
  // Existing categories...

  // Add your custom category
  your_brand_style: `# Your Brand Style Guide

## Brand Aesthetic
- Key elements of your brand's visual identity
- Core style principles
- Signature looks and combinations

## Your Brand's Styling Do's
- Brand-specific styling recommendations
- Preferred color combinations
- Signature styling techniques

## Your Brand's Styling Don'ts
- Combinations to avoid
- Styling approaches that don't align with brand identity
- Common styling mistakes to avoid
`
};
```

For complete customization, you can modify the `get_style_guide` tool in `src/tools/get-style-guide.ts`.

### Project Structure

```
src/
├── index.ts              # stdio bin (serveStdio)
├── server.ts             # createFindMineDeps() + createFindMineServer(deps, { extend })
├── config.ts             # Environment configuration
├── api/                  # FindMine API client
├── tools/                # Tool registrations, Zod input/output schemas (schemas.ts)
├── resources/            # product:/// and look:/// resource templates and URI helpers
├── prompts/              # Prompts with Zod argument schemas
├── content/              # Style guide content
├── services/             # Business logic layer (caching, resource store)
├── types/                # TypeScript type definitions
└── utils/                # Cache, formatters, logger, resource mapping
tests/
├── unit/
├── integration/
└── fakes/
```

### Technical Details

This server is built with:
- **MCP TypeScript SDK v2** (`@modelcontextprotocol/server`), serving protocol revisions 2025-11-25 and 2026-07-28 over stdio
- **Tool titles, annotations** (read-only, destructive, idempotent, open-world hints) and **output schemas** with structured results
- **Zod 4 schemas** for all tool inputs and outputs
- **Modular architecture** with separated concerns
- **Vitest** unit tests and in-process integration tests

## API Examples

### Get Style Guide

```json
{
  "name": "get_style_guide",
  "arguments": {
    "category": "color_theory",
    "occasion": "wedding"
  }
}
```

### Get Complete the Look

```json
{
  "name": "get_complete_the_look",
  "arguments": {
    "product_id": "P12345",
    "product_color_id": "C789"
  }
}
```

### Get Visually Similar Products

```json
{
  "name": "get_visually_similar",
  "arguments": {
    "product_id": "P12345",
    "product_color_id": "C789",
    "limit": 5
  }
}
```

## Publishing

### Publishing to npm

```bash
# Login to npm
npm login

# Publish the package
npm publish

# Update the version for future releases
npm version patch
```

### Publishing to Docker Hub

```bash
# Build the Docker image
docker build -t findmine/mcp-server:latest .

# Login to Docker Hub
docker login

# Push the image
docker push findmine/mcp-server:latest
```

## License

This project is licensed under the MIT License.
