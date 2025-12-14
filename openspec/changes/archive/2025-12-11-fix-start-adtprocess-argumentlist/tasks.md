## 1. Knowledge Files Updates

### EXE Installer Guide
- [x] 1.1 Update `src/knowledge/installers/exe.md:105` - InstallShield response file example
- [x] 1.2 Update `src/knowledge/installers/exe.md:271` - MSI wrapper extract example

### MSI Installer Guide
- [x] 1.3 Update `src/knowledge/installers/msi.md:189` - Custom log location example

### MSIX Installer Guide
- [x] 1.4 Update `src/knowledge/installers/msix.md:85` - PowerShell execution example

### Reference Documentation
- [x] 1.5 Update `src/knowledge/reference/exit-codes.md:199` - IgnoreExitCodes example

### PSADT Migration Guide
- [x] 1.6 Update `src/knowledge/psadt/migration.md:297` - Basic Start-ADTProcess example
- [x] 1.7 Update `src/knowledge/psadt/migration.md:380` - WindowStyle example

### Prerequisites Pattern
- [x] 1.8 Update `src/knowledge/patterns/prerequisites.md:201` - .NET installer example
- [x] 1.9 Update `src/knowledge/patterns/prerequisites.md:217` - VC++ Redistributable example
- [x] 1.10 Update `src/knowledge/patterns/prerequisites.md:259` - Dynamic prerequisite install
- [x] 1.11 Update `src/knowledge/patterns/prerequisites.md:293` - Download and install helper
- [x] 1.12 Update `src/knowledge/patterns/prerequisites.md:308` - Install-Prerequisite call example
- [x] 1.13 Update `src/knowledge/patterns/prerequisites.md:355` - Start-ADTProcess with PassThru

### Contributing Guide
- [x] 1.14 Update `src/knowledge/CONTRIBUTING.md:100` - Example code snippet

## 2. Test File Updates
- [x] 2.1 Update `src/__tests__/prompts.test.ts:304` - Test expectation for correct parameter

## 3. Verification
- [x] 3.1 Run `grep -r "Start-ADTProcess.*-Arguments" src/knowledge/` to verify no remaining instances
- [x] 3.2 Run `npm run build` to ensure compilation succeeds
- [x] 3.3 Run `npm run test` to verify tests pass (185 tests passed)
