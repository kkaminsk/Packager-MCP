# Change: Add MCP Server Registration to Claude CLI During Installation

## Why

After installing Packager-MCP, users must manually run `claude mcp add` to register the server with Claude Code. This adds friction and requires users to construct the correct command with paths and environment variables. Automating this during installation improves the user experience and ensures proper configuration.

## What Changes

- Add a custom dialog in the install wizard prompting for GitHub Personal Access Token (PAT)
- Add `GITHUBPAT` public property for command-line/silent installs
- Add custom action to run `claude mcp add packager-mcp` after installation
- Pass GitHub PAT as `GITHUB_TOKEN` environment variable to the MCP server
- Skip registration if Claude Code is not installed (graceful degradation)

## Impact

- Affected specs: `wix-installer`
- Affected code: `installer/Product.wxs`, new `installer/ClaudeRegistration.wxs`
- New files: PowerShell script for registration custom action
