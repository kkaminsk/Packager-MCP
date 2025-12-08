## 1. Type Definitions
- [x] 1.1 Create `types/winget.ts` with manifest types (WingetManifest, Installer, InstallerSwitches)
- [x] 1.2 Add input/output types for `search_winget` tool
- [x] 1.3 Add input/output types for `get_silent_install_args` tool

## 2. Winget Service
- [x] 2.1 Create `services/winget.ts` service class
- [x] 2.2 Implement `searchPackages()` method using GitHub Search API
- [x] 2.3 Implement `getManifest()` method for fetching raw YAML manifests
- [x] 2.4 Implement `parseManifest()` for YAML-to-object conversion
- [x] 2.5 Implement `getSilentInstallArgs()` with confidence levels
- [x] 2.6 Integrate with cache layer (1hr manifest TTL, 15min search TTL)
- [x] 2.7 Add GitHub PAT token support from configuration

## 3. Silent Install Args Database
- [x] 3.1 Create `knowledge/reference/silent-args.json` with known installer patterns
- [x] 3.2 Include patterns for NSIS, Inno Setup, InstallShield, WiX, MSI
- [x] 3.3 Add application-specific overrides where needed

## 4. MCP Tools
- [x] 4.1 Register `search_winget` tool in handlers
- [x] 4.2 Implement `search_winget` handler with input validation
- [x] 4.3 Register `get_silent_install_args` tool in handlers
- [x] 4.4 Implement `get_silent_install_args` handler

## 5. Error Handling
- [x] 5.1 Add rate limit detection and user-friendly messaging
- [x] 5.2 Add graceful fallback when GitHub API unavailable
- [x] 5.3 Add timeout handling for slow API responses

## 6. Testing
- [x] 6.1 Unit tests for manifest parsing
- [x] 6.2 Unit tests for silent args lookup
- [x] 6.3 Integration tests with mocked GitHub API responses
- [x] 6.4 Test with real Winget packages (Chrome, Firefox, 7-Zip)

## 7. Documentation
- [x] 7.1 Document `search_winget` tool usage and parameters
- [x] 7.2 Document `get_silent_install_args` tool usage
- [x] 7.3 Document GitHub PAT configuration for higher rate limits
