# Contributing to Packager-MCP

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Development Setup

### Prerequisites

- **Node.js 20+** (LTS recommended)
- **npm** (comes with Node.js)
- **Git**

### Getting Started

```bash
git clone https://github.com/kkaminsk/Packager-MCP.git
cd Packager-MCP
npm install
npm run build
```

### Running in Development

```bash
# Watch mode (recompiles on changes)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Validate knowledge base
npm run validate:knowledge
```

## Code Style

- **TypeScript**: Strict mode. See `tsconfig.json` for compiler settings.
- **Naming**: `camelCase` for variables/functions, `PascalCase` for types/classes, `SCREAMING_SNAKE_CASE` for constants.
- **Files**: `kebab-case.ts` for file names.
- **Async**: Prefer `async/await` over raw Promises.
- **Exports**: Named exports preferred.

For full conventions, see `openspec/project.md`.

## Architecture

```
src/
├── server.ts           # Entry point
├── handlers/           # MCP protocol handlers (tools, resources, prompts)
├── services/           # Business logic layer
├── knowledge/          # Embedded documentation and reference data
├── templates/          # Handlebars templates for PSADT scripts
├── cache/              # LRU cache implementation
├── config/             # Configuration loading and validation
├── utils/              # Logger, errors, path validation
├── types/              # TypeScript type definitions
└── __tests__/          # Unit tests (vitest)
```

**Pattern**: Handlers → Services → External APIs. All external API calls go through the cache layer.

## Branching & PRs

- **Main branch**: `main` — production-ready code
- **Feature branches**: `feature/{description}`
- **Fix branches**: `fix/{description}`
- **Commits**: Use conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)
- **PRs**: Required for all changes to `main`

## Testing

- All services should have unit tests
- Run `npm test` before submitting PRs
- Coverage target: 80% for the services layer

## Spec-Driven Development

This project uses [OpenSpec](https://github.com/openspec) for managing specifications and change proposals. See `openspec/` for current specs and active proposals.

## Questions?

Open an issue on GitHub or check existing issues for guidance.
