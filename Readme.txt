Make sure to configure the MCP server for your environment.

Get your token from: https://github.com/settings/personal-access-tokens

Claude Cli:
claude mcp add packager-mcp -s user -e GITHUB_TOKEN=ghp_your_token_here -- node "C:/Program Files/Packager-MCP/dist/server.js"

Edit your MCP configuration file:

{
  "mcpServers": {
    "packager-mcp": {
      "command": "node",
      "args": ["C:/Program Files/Packager-MCP/dist/server.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    }
  }
}