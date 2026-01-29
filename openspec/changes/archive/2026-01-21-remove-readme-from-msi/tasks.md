# Tasks

## Implementation Tasks

- [x] **Task 1**: Remove the `ReadmeTxtFile` component from `RootFilesComponents` in `installer/Product.wxs`
  - Lines 146-148: Delete the component that installs `Readme.txt`

- [x] **Task 2**: Remove the `ReadmeShortcut` from `ShortcutComponents` in `installer/Product.wxs`
  - Lines 193-195: Delete the Start Menu shortcut pointing to `Readme.txt`

## Validation

- [x] **Task 3**: Verify WiX project compiles without errors
  - Run `dotnet build installer/Packager-MCP.wixproj` - Build succeeded with 0 errors

- [x] **Task 4**: Verify MSI installs correctly (manual verification required)
  - Manual step: Install MSI and confirm `Readme.txt` is not present
  - Manual step: Confirm Start Menu no longer has "Packager-MCP Readme" shortcut

## Dependencies

None - this is a standalone change with no dependencies on other proposals.
