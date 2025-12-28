# Implementation Tasks

## 1. Authentication Layer

- [x] 1.1 Create `src/types/azure-auth.ts` with authentication types
- [x] 1.2 Create `src/services/graph-auth.ts` for certificate-based authentication
- [x] 1.3 Add `@azure/identity` npm dependency for certificate credential
- [x] 1.4 Implement environment variable reading for auth config
- [x] 1.5 Implement token acquisition with `DeviceManagementApps.ReadWrite.All` scope
- [x] 1.6 Add error handling with clear remediation messages

## 2. Intune Graph API Service

- [x] 2.1 Create `src/types/intune-publisher.ts` with Win32 app types
- [x] 2.2 Create `src/services/intune-publisher.ts` with Graph API client
- [x] 2.3 Implement Win32 LOB app creation endpoint
- [x] 2.4 Implement content upload for .intunewin files (chunked upload)
- [x] 2.5 Implement detection rule assignment
- [x] 2.6 Implement category retrieval and assignment
- [x] 2.7 Implement logo upload

## 3. Metadata Enrichment

- [ ] 3.1 Add web search integration for app descriptions (deferred - uses default description)
- [ ] 3.2 Implement description extraction and truncation (deferred)
- [x] 3.3 Add category mapping logic based on app name/description
- [ ] 3.4 Implement logo search and download (deferred - user provides logo path)
- [x] 3.5 Add image format validation (PNG/JPEG, dimensions)

## 4. MCP Tool Implementation

- [x] 4.1 Add `publish_to_intune` tool definition to tools handler
- [x] 4.2 Define input schema with all parameters
- [x] 4.3 Implement input validation (file path, app name, version)
- [x] 4.4 Wire up service calls for full publish workflow
- [x] 4.5 Implement response formatting with Intune portal URL

## 5. MCP Prompt Workflow

- [x] 5.1 Add `/publish-to-intune` prompt to prompts handler
- [x] 5.2 Implement prerequisite validation step
- [x] 5.3 Implement metadata confirmation step
- [x] 5.4 Implement detection rule review step
- [x] 5.5 Implement upload execution step
- [x] 5.6 Implement success/error reporting

## 6. Testing

- [ ] 6.1 Unit tests for graph-auth service (manual testing recommended)
- [ ] 6.2 Unit tests for intune-publisher service (requires mocking Graph API)
- [ ] 6.3 Integration tests with mock MCP client
- [ ] 6.4 Manual testing with real Intune tenant

## 7. Documentation

- [x] 7.1 Update CLAUDE.md with new tool documentation
- [x] 7.2 Add environment variable documentation
- [x] 7.3 Add service principal setup guide
- [ ] 7.4 Update README if needed

## Notes

- Web search integration for descriptions and logos was deferred. The tool accepts user-provided descriptions and logo paths.
- Unit tests for the new services require extensive mocking of Azure Identity and Graph API. Manual testing with a real Intune tenant is recommended.
- Build and all existing tests pass (177 tests).
