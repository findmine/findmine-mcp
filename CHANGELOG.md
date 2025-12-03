# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
