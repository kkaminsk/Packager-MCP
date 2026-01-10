# Tasks

## 1. WiX UI Setup

- [x] 1.1 Add WixUI extension reference to Product.wxs
- [x] 1.2 Configure WixUI_InstallDir as base dialog set
- [x] 1.3 Create custom GitHubTokenDlg dialog definition

## 2. Property and Dialog Configuration

- [x] 2.1 Add `GITHUBPAT` public property with `Secure="yes"` and `Hidden="yes"`
- [x] 2.2 Add `REGISTERWITHCLAUDE` property (default: 1) for opt-out checkbox
- [x] 2.3 Insert GitHubTokenDlg into dialog sequence after InstallDirDlg
- [x] 2.4 Add password edit control for PAT input
- [x] 2.5 Add checkbox for "Register with Claude Code" option

## 3. Custom Action Implementation

- [x] 3.1 Create `installer/Register-PackagerMcp.ps1` script
- [x] 3.2 Detect Claude Code installation (check PATH and common locations)
- [x] 3.3 Run `claude mcp add` with appropriate arguments
- [x] 3.4 Handle missing Claude Code gracefully (exit 0 with warning)
- [x] 3.5 Handle registration failure gracefully (non-fatal)

## 4. WiX Custom Action Integration

- [x] 4.1 Add PowerShell custom action using WixToolset.PowerShell extension
- [x] 4.2 Configure as deferred custom action (runs elevated)
- [x] 4.3 Schedule after InstallFinalize
- [x] 4.4 Pass INSTALLFOLDER and GITHUBPAT to script
- [x] 4.5 Condition on `REGISTERWITHCLAUDE=1` and `NOT Installed`

## 5. Silent Install Support

- [x] 5.1 Document `GITHUBPAT` property usage in README
- [x] 5.2 Document `REGISTERWITHCLAUDE=0` to skip registration
- [ ] 5.3 Test silent install with PAT: `msiexec /i ... /qn GITHUBPAT=ghp_xxx`
- [ ] 5.4 Test silent install without PAT (should still register, just no token)

## 6. Testing

- [ ] 6.1 Test interactive install with PAT entered
- [ ] 6.2 Test interactive install with PAT blank
- [ ] 6.3 Test interactive install with "Register" unchecked
- [ ] 6.4 Test silent install with GITHUBPAT property
- [ ] 6.5 Test install when Claude Code is not installed (should skip gracefully)
- [ ] 6.6 Verify `claude mcp list` shows packager-mcp after install

## 7. Documentation

- [x] 7.1 Update installer/README.md with new dialog and properties
- [x] 7.2 Add troubleshooting for registration failures
