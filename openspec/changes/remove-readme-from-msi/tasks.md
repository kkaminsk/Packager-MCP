# Tasks

## Implementation Tasks

- [ ] **Task 1**: Remove the `ReadmeTxtFile` component from `RootFilesComponents` in `installer/Product.wxs`
  - Lines 146-148: Delete the component that installs `Readme.txt`

- [ ] **Task 2**: Remove the `ReadmeShortcut` from `ShortcutComponents` in `installer/Product.wxs`
  - Lines 196-198: Delete the Start Menu shortcut pointing to `Readme.txt`

## Validation

- [ ] **Task 3**: Verify WiX project compiles without errors
  - Run `dotnet build installer/Packager-MCP.wixproj`

- [ ] **Task 4**: Verify MSI installs correctly
  - Install MSI and confirm `Readme.txt` is not present in installation folder
  - Confirm Start Menu no longer has "Packager-MCP Readme" shortcut

## Dependencies

None - this is a standalone change with no dependencies on other proposals.
