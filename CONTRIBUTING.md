# Contributing to FindMine MCP

Thank you for your interest in contributing to the FindMine MCP server! This document provides guidelines for contributions.

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/findmine/findmine-mcp.git
   cd findmine-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development mode:
   ```bash
   npm run watch
   ```

4. Test with MCP Inspector:
   ```bash
   npm run inspector
   ```

## Contribution Guidelines

### Code Style
- Follow the existing TypeScript style in the codebase
- Maintain 2 space indentation
- Use camelCase for variables/functions, PascalCase for types/interfaces
- Include JSDoc comments for public functions/methods
- Follow import conventions (external libraries first, then local modules)

### Pull Requests
1. Fork the repository and create a feature branch
2. Make your changes following our coding conventions
3. Add tests if applicable
4. Ensure all tests and builds pass
5. Submit a PR with a clear description of the changes and their purpose

### Commit Messages
- Use clear, descriptive commit messages
- Start with a verb in present tense (e.g., "Add feature" not "Added feature")
- Reference issue numbers when applicable

## Testing
Please ensure your code runs successfully with the MCP Inspector before submitting.

## License
By contributing, you agree that your contributions will be licensed under the project's MIT License.