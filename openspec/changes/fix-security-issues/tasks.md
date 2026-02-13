## 1. Remove Tracked Certificates
- [x] 1.1 Run `git rm --cached scripts/packager-mcp.pem scripts/packager-mcp.pfx`
- [x] 1.2 Add `*.pem`, `*.pfx`, `*.p12` to `.gitignore` (globally, not path-scoped)
- [ ] 1.3 Document in README that certificates should never be committed

## 2. Clean Up .gitignore
- [x] 2.1 Remove duplicate `.claude/settings.local.json` entries (appears 4 times)
- [x] 2.2 Replace one-off test directories (`/TEST_WinRAR_Package4`, `/Test`, `/testing`) with a single pattern or comment
- [x] 2.3 Add section comments for organization

## 3. Configurable CORS
- [x] 3.1 Add `corsOrigin` field to `transportConfigSchema` in `src/config/schema.ts` (default: `http://localhost`)
- [x] 3.2 Update `src/http-server.ts` to read CORS origin from config instead of `*`
- [x] 3.3 Update `packager-mcp.example.yaml` with CORS configuration example
- [ ] 3.4 Add test for CORS header behavior
