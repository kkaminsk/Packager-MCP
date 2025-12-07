# Intune Packaging Assistant MCP Server

An MCP (Model Context Protocol) server that transforms Claude CLI and compatible AI tools into expert Windows application packaging assistants for Microsoft Intune.

## Installation

### Prerequisites

- Node.js 20 or higher
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/kkaminsk/Packager-MCP.git
cd Packager-MCP

# Install dependencies
npm install

# Build
npm run build
```

## Usage

### With Claude CLI

```bash
# Add the server to Claude CLI
claude mcp add packager-mcp node /path/to/Packager-MCP/dist/server.js
```

### Running Directly

```bash
npm start
```

## Configuration

Copy the example configuration file and customize as needed:

```bash
cp packager-mcp.example.yaml packager-mcp.yaml
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `name` | Server identification name | `intune-packaging-assistant` |
| `version` | Server version | `1.0.0` |
| `cache.maxSize` | Maximum cache entries | `1000` |
| `cache.defaultTtlMs` | Default TTL in ms | `900000` (15 min) |
| `cache.manifestTtlMs` | Manifest cache TTL | `3600000` (1 hour) |
| `cache.searchTtlMs` | Search cache TTL | `900000` (15 min) |
| `logging.level` | Log level (debug/info/warn/error) | `info` |
| `logging.format` | Output format (json/text) | `json` |
| `github.token` | GitHub PAT for higher rate limits | none |
| `github.rateLimitRetries` | Retry count on rate limit | `3` |

## Development

```bash
# Run in watch mode
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Project Structure

```
src/
├── server.ts              # Entry point, server initialization
├── handlers/
│   ├── index.ts           # Handler registration
│   ├── tools.ts           # Tool handler
│   ├── resources.ts       # Resource handler
│   └── prompts.ts         # Prompt handler
├── cache/
│   └── lru-cache.ts       # LRU cache implementation
├── config/
│   ├── loader.ts          # YAML config loader
│   └── schema.ts          # Config validation
├── utils/
│   ├── logger.ts          # Structured logging
│   └── errors.ts          # Custom error types
└── types/
    ├── index.ts           # Type exports
    ├── mcp.ts             # MCP protocol types
    └── config.ts          # Configuration types
```

## License

ISC
