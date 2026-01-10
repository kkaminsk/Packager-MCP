# Design: MCP Server Registration

## Context

The installer currently requires users to manually register the MCP server with Claude Code post-installation. This involves running a complex command with paths and optional environment variables. Automating this in the installer streamlines the setup process.

## Goals / Non-Goals

**Goals:**
- Prompt user for GitHub PAT during interactive install
- Support silent installs via `GITHUBPAT` property
- Register MCP server with Claude Code automatically
- Handle missing Claude Code gracefully

**Non-Goals:**
- Validating the GitHub PAT against the API (done at runtime)
- Supporting multiple MCP server registrations
- Azure/Intune environment variable configuration (separate feature)

## Decisions

### Decision: Use WiX UI Extension with Custom Dialog

WiX provides `WixUI_InstallDir` which can be extended with custom dialogs. We'll insert a "GitHub Configuration" dialog after the installation directory selection.

**Alternatives considered:**
- Custom action prompting via PowerShell: More complex, less integrated with MSI UI
- Post-install separate wizard: Additional step, worse UX

### Decision: PowerShell Custom Action for Registration

Use a deferred PowerShell custom action to run `claude mcp add` after file installation.

**Rationale:**
- Claude Code CLI is the supported way to register MCP servers
- PowerShell can handle path escaping and error handling
- Deferred action runs with elevated privileges

### Decision: Store PAT in Registry (Optional)

Store the GitHub PAT in `HKLM\SOFTWARE\Packager-MCP\GitHubToken` for the launch script to read.

**Alternatives considered:**
- Pass directly to `claude mcp add -e`: Preferred approach, avoids storing secret
- User environment variable: Requires user context, doesn't work for all scenarios

**Final decision:** Pass PAT directly via `-e GITHUB_TOKEN=<value>` to `claude mcp add`. Do NOT store in registry.

## Implementation Approach

### 1. Custom Dialog (GitHubTokenDlg)

```xml
<Dialog Id="GitHubTokenDlg" Width="370" Height="270" Title="GitHub Configuration">
  <Control Id="GitHubTokenLabel" Type="Text" X="20" Y="60" Width="330" Height="40"
           Text="Enter your GitHub Personal Access Token (PAT) for Winget API access. This is optional but recommended for higher rate limits." />
  <Control Id="GitHubTokenEdit" Type="Edit" X="20" Y="110" Width="330" Height="18"
           Property="GITHUBPAT" Password="yes" />
  <!-- Navigation buttons -->
</Dialog>
```

### 2. Public Property

```xml
<Property Id="GITHUBPAT" Secure="yes" />
```

The `Secure="yes"` attribute allows passing sensitive values from command line.

### 3. Custom Action Sequence

```
InstallFiles → RegisterMcpServer (deferred, after InstallFinalize)
```

### 4. Registration Script

```powershell
# Register-PackagerMcp.ps1
param(
    [string]$InstallPath,
    [string]$GitHubPat
)

$claudeExe = Get-Command claude -ErrorAction SilentlyContinue
if (-not $claudeExe) {
    Write-Warning "Claude Code not found. Skipping MCP registration."
    exit 0
}

$nodeExe = Join-Path $InstallPath "nodejs\node.exe"
$serverJs = Join-Path $InstallPath "dist\server.js"

$args = @("mcp", "add", "packager-mcp", "-s", "user")
if ($GitHubPat) {
    $args += @("-e", "GITHUB_TOKEN=$GitHubPat")
}
$args += @("--", $nodeExe, $serverJs)

& claude @args
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Claude Code not in PATH | Check for claude.exe, skip gracefully with warning |
| PAT visible in MSI log | Use `Hidden="yes"` on property, avoid logging value |
| Custom action failure blocks install | Use `Continue="yes"` to make non-fatal |
| User installs as SYSTEM (Intune) | SYSTEM context won't have user's Claude config; document limitation |

## Open Questions

1. Should we support removing the registration on uninstall? (Recommend: No, leave existing config)
2. Should we add a checkbox to skip registration? (Recommend: Yes, add "Register with Claude Code" checkbox)
