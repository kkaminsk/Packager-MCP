# Manual Testing Checklist

Remaining manual testing tasks from OpenSpec changes before archiving.

## add-intune-publisher (5 tasks)

- [ ] 6.1 Unit tests for graph-auth service (manual testing recommended)
- [ ] 6.2 Unit tests for intune-publisher service (requires mocking Graph API)
- [ ] 6.3 Integration tests with mock MCP client
- [ ] 6.4 Manual testing with real Intune tenant
- [ ] 7.4 Update README if needed

## add-intune-setup-script (7 tasks)

### Deferred (optional)
- [ ] 2.7 Implement uninstall/cleanup mode
- [ ] 5.2 Create companion `.md` files for each PowerShell function

### Manual Testing
- [ ] 6.1 Manual testing with real Azure tenant
- [ ] 6.2 Test certificate generation workflow
- [ ] 6.3 Test existing app registration update
- [ ] 6.4 Test uninstall/cleanup workflow
- [ ] 6.5 Test MCP server config loading from YAML

## add-wix-installer (7 tasks)

- [ ] 6.3 Test upgrade from v1.0.0 to v1.0.1 scenario
- [ ] 9.1 Test fresh install on clean Windows 10 VM
- [ ] 9.2 Test fresh install on Windows 11
- [ ] 9.3 Test silent install (`msiexec /i ... /qn`)
- [ ] 9.4 Test uninstall removes all files and registry
- [ ] 9.5 Test upgrade preserves user configuration
- [ ] 9.6 Test install fails gracefully without Node.js

## bundle-nodejs-in-msi (3 tasks)

- [ ] 5.2 Verify installation on system without Node.js installed
- [ ] 5.3 Verify MCP server starts using bundled Node.js
- [ ] 5.4 Verify bundled Node.js doesn't conflict with system Node.js

---

## Test Environment Requirements

| Environment | Required For |
|-------------|--------------|
| Azure tenant with Intune | add-intune-publisher, add-intune-setup-script |
| Windows 10 VM (clean) | add-wix-installer |
| Windows 11 VM (clean) | add-wix-installer |
| System without Node.js | bundle-nodejs-in-msi |

## After Testing

Once all tests pass, archive each change:

```bash
openspec archive add-intune-publisher --yes
openspec archive add-intune-setup-script --yes
openspec archive add-wix-installer --yes
openspec archive bundle-nodejs-in-msi --yes
```
