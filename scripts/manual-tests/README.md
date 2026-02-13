# Manual Test Scripts

These are ad-hoc integration and manual test scripts that exercise specific functionality outside the automated test suite. They require real API connections or specific environment setup.

## Scripts

| Script | Purpose |
|--------|---------|
| `test-all-templates.mjs` | Tests all PSADT template generation |
| `test-intune-connection.mjs` | Tests Intune Graph API connectivity |
| `test-mcp-template.mjs` | Tests MCP template generation |
| `test-mcp-template-with-output.mjs` | Tests template generation with file output |
| `test-parse-intunewin.mjs` | Tests .intunewin file parsing |
| `test-publish-debug.mjs` | Debug script for Intune publishing |
| `test-publish-direct.mjs` | Tests direct Intune publishing |
| `test-template.mjs` | Basic template generation test |

## Running

```bash
node scripts/manual-tests/test-all-templates.mjs
```

These scripts are NOT run by `npm test`. For the automated test suite, see `src/__tests__/`.
