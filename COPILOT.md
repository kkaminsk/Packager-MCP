# Intune Packaging Assistant MCP Server - GitHub Copilot CLI

An MCP (Model Context Protocol) server that transforms GitHub Copilot CLI into an expert Windows application packaging assistant for Microsoft Intune.

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

### With GitHub Copilot CLI

Add the MCP server to your GitHub Copilot configuration:

```bash
# Using gh CLI
gh copilot config set mcp-servers.packager-mcp.command "node"
gh copilot config set mcp-servers.packager-mcp.args "C:/temp/Packager-MCP/dist/server.js"
```

Or manually edit your Copilot configuration file:

**Windows**: `%APPDATA%\GitHub Copilot\config.json`  
**macOS/Linux**: `~/.config/github-copilot/config.json`

```json
{
  "mcp-servers": {
    "packager-mcp": {
      "command": "node",
      "args": ["C:/path/to/Packager-MCP/dist/server.js"]
    }
  }
}
```

After configuration, restart GitHub Copilot CLI to load the server.

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

## Features

This MCP server provides specialized tools and knowledge for Microsoft Intune packaging:

### Available Tools
- **`search_winget`** - Query Winget repository for app metadata, installer URLs, and silent arguments
- **`get_psadt_template`** - Generate PSADT v4 deployment scripts based on installer type
- **`validate_package`** - Verify scripts against enterprise best practices
- **`get_silent_install_args`** - Retrieve silent installation parameters for common installers
- **`generate_intune_detection`** - Create Intune detection rules (file/registry/MSI/script-based)

### Guided Prompts
- **`/package-app`** - Complete guided workflow for creating Intune packages
- **`/convert-legacy`** - Migrate PSADT v3 scripts to v4 format
- **`/troubleshoot`** - Diagnose and fix failing package deployments
- **`/bulk-lookup`** - Batch retrieve information for multiple applications

### Knowledge Resources
- **PSADT v4** documentation, functions, variables, and migration guides
- **Installer types** (MSI, EXE, MSIX) with silent install arguments
- **Packaging patterns** for detection, prerequisites, and user-context deployments
- **Reference databases** for exit codes and silent install arguments

## Development

```bash
# Run in watch mode
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Troubleshooting

### Server not loading
- Verify the path to `dist/server.js` is absolute
- Check that the build completed successfully (`npm run build`)
- Restart GitHub Copilot CLI after configuration changes

### Configuration issues
- Ensure `packager-mcp.yaml` exists (copy from `packager-mcp.example.yaml`)
- Validate YAML syntax
- Check file permissions

### GitHub API rate limits
- Anonymous requests limited to 60/hour
- Add GitHub PAT token in config for 5000/hour limit
- Server caches Winget manifests (1 hour) and searches (15 min)

## Architecture

### Components
- **MCP Server Core** - Protocol handlers, config management, caching, logging
- **Winget Integration** - GitHub API client for microsoft/winget-pkgs repository
- **PSADT Templates** - Script generation engine with v4 syntax support
- **Validation Engine** - Best practice checks for packaging scripts
- **Detection Generator** - Intune detection rule creation (file, registry, MSI, script)
- **Knowledge Base** - Embedded documentation and reference databases

### Project Structure

```
src/
├── server.ts              # MCP server entry point
├── handlers/
│   ├── index.ts           # Handler registration
│   ├── tools.ts           # Tool implementations
│   ├── resources.ts       # Resource handlers
│   └── prompts.ts         # Prompt workflows
├── services/
│   ├── winget.ts          # Winget API integration
│   ├── psadt.ts           # PSADT template generation
│   ├── validation.ts      # Package validation
│   └── detection.ts       # Intune detection rule generation
├── cache/
│   └── lru-cache.ts       # LRU cache implementation
├── config/
│   ├── loader.ts          # YAML config loader
│   └── schema.ts          # Config validation
├── knowledge/             # Embedded documentation
│   ├── psadt/             # PSADT v4 docs and patterns
│   ├── installers/        # Installer type guides
│   └── reference/         # Silent args, exit codes
├── utils/
│   ├── logger.ts          # Structured logging
│   └── errors.ts          # Custom error types
└── types/
    ├── index.ts           # Type exports
    ├── mcp.ts             # MCP protocol types
    ├── config.ts          # Configuration types
    ├── winget.ts          # Winget types
    ├── psadt.ts           # PSADT types
    ├── validation.ts      # Validation types
    └── intune.ts          # Intune detection types
```

## Contributing

See `AGENTS.md` for development guidelines and `openspec/` for change proposal process.

## License

ISC

---

**Last updated**: 2025-12-08
