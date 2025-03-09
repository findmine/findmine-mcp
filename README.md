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
- **track_interaction**: Track user interactions with products (optional)
- **update_item_details**: Update product stock and sale status (optional)

### Prompts
- **outfit_completion**: Get styling advice for complete outfits
- **styling_guide**: Access comprehensive fashion styling guidelines
- **findmine_help**: Learn how to use FindMine's tools and resources

## Installation

```bash
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
| `FINDMINE_ENABLE_TRACKING` | Enable tracking features | false |
| `FINDMINE_ENABLE_ITEM_UPDATES` | Enable item updates | false |
| `NODE_ENV` | Set to "development" for sample data | - |

## Usage with Claude Desktop

The server automatically configures Claude Desktop during installation. To verify:

**macOS:**
```bash
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows:**
```
type %APPDATA%\Claude\claude_desktop_config.json
```

## Development

### MCP Inspector

The MCP Inspector is a development tool for testing your server:

```bash
npm run inspector
```

This will open a web interface at http://localhost:5173 where you can interact with your server.

### Development Mode

Run the server with sample data:

```bash
NODE_ENV=development npm run build && node build/index.js
```

### Project Structure

- `src/index.ts`: Main MCP server implementation
- `src/api/`: FindMine API client
- `src/services/`: Business logic and service layer
- `src/types/`: TypeScript type definitions
- `src/utils/`: Utility functions and helpers

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
    "in_stock": true,
    "on_sale": false
  }
}
```

### Get Visually Similar Products

```json
{
  "name": "get_visually_similar",
  "arguments": {
    "product_id": "P12345",
    "limit": 5
  }
}
```

## License

This project is licensed under the MIT License.
