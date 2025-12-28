# Implementation Tasks

## 1. PowerShell Function Library

- [x] 1.1 Create `scripts/functions/` directory structure
- [x] 1.2 Create `Write-PackagerMcpLog.ps1` - Logging with timestamps and severity
- [x] 1.3 Create `Invoke-GraphWithRetry.ps1` - Graph API calls with retry logic
- [x] 1.4 Create `Connect-PackagerMcpGraph.ps1` - Graph connection with admin scopes
- [x] 1.5 Create `Disconnect-PackagerMcpGraph.ps1` - Clean disconnection
- [x] 1.6 Create `Get-PackagerMcpApplication.ps1` - Retrieve app registration
- [x] 1.7 Create `Set-PackagerMcpApplication.ps1` - Create/update app registration
- [x] 1.8 Create `Set-PackagerMcpPermissions.ps1` - Configure Graph API permissions
- [x] 1.9 Create `Grant-PackagerMcpConsent.ps1` - Grant admin consent
- [x] 1.10 Create `Set-PackagerMcpCertificate.ps1` - Certificate management
- [x] 1.11 Create `Confirm-PackagerMcpAction.ps1` - User confirmation prompts
- [x] 1.12 Create `Test-PackagerMcpConnection.ps1` - Validate setup
- [x] 1.13 Create `Export-PackagerMcpConfig.ps1` - Export YAML configuration

## 2. Main Setup Script

- [x] 2.1 Create `scripts/Setup-PackagerMcpIntune.ps1` main script
- [x] 2.2 Implement parameter handling (CertificatePath, ConfigPath, Force, SkipTest)
- [x] 2.3 Implement interactive workflow orchestration
- [x] 2.4 Implement certificate generation (self-signed)
- [x] 2.5 Implement YAML configuration output
- [x] 2.6 Implement post-setup validation
- [ ] 2.7 Implement uninstall/cleanup mode (deferred - optional feature)
- [x] 2.8 Add comprehensive error handling

## 3. Configuration Schema

- [x] 3.1 Define `intune_mcp_config.yaml` schema (via Export-PackagerMcpConfig)
- [x] 3.2 Create TypeScript types for YAML config (`src/types/intune-config.ts`)
- [x] 3.3 Create YAML config loader (`src/config/intune-config.ts`)
- [x] 3.4 Add config file discovery logic (CWD, install dir, home dir)

## 4. MCP Server Integration

- [x] 4.1 Update `src/services/graph-auth.ts` to load from YAML config
- [x] 4.2 Implement config precedence (env vars > YAML)
- [x] 4.3 Add config validation with clear error messages
- [x] 4.4 Update startup logging to show config source

## 5. Documentation

- [x] 5.1 Create `scripts/README.md` with setup instructions
- [ ] 5.2 Create companion `.md` files for each PowerShell function (deferred - functions are self-documented)
- [x] 5.3 Update `CLAUDE.md` with setup script documentation
- [x] 5.4 Update `openspec/project.md` with PowerShell conventions (done in proposal phase)

## 6. Testing

- [ ] 6.1 Manual testing with real Azure tenant
- [ ] 6.2 Test certificate generation workflow
- [ ] 6.3 Test existing app registration update
- [ ] 6.4 Test uninstall/cleanup workflow
- [ ] 6.5 Test MCP server config loading from YAML

## Dependencies

- Tasks 1.x can be parallelized
- Task 2.x depends on 1.x (uses function library)
- Task 3.x and 4.x can be parallelized
- Task 4.x depends on 3.x for types
- Task 5.x can proceed once 1.x and 2.x are complete
- Task 6.x requires all other tasks complete

## Notes

- PowerShell functions based on patterns from `C:\temp\myfunctions\referencefunctions`
- Use `Verb-PackagerMcpNoun` naming convention (not `AuditWindows`)
- Requires Microsoft.Graph PowerShell module
- Target PowerShell 7+ for cross-platform compatibility

## Completion Summary

**Completed:** 26 tasks
**Deferred:** 2 tasks (uninstall mode, per-function docs)
**Pending:** 5 tasks (manual testing)

All core functionality is implemented and the build passes. The setup script and YAML config loader are ready for use.
