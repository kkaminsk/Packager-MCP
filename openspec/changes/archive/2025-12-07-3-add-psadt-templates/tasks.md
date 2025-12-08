## 1. Type Definitions
- [x] 1.1 Create `types/psadt.ts` with template types (TemplateOptions, TemplateOutput, CustomizationPoint)
- [x] 1.2 Add input/output types for `get_psadt_template` tool

## 2. Knowledge Base Content
- [x] 2.1 Create `knowledge/psadt/overview.md` - PSADT v4 architecture
- [x] 2.2 Create `knowledge/psadt/functions.md` - Function reference (ADT-prefixed)
- [x] 2.3 Create `knowledge/psadt/variables.md` - Built-in variables ($ADTSession, etc.)
- [x] 2.4 Create `knowledge/psadt/migration.md` - v3 to v4 migration guide
- [x] 2.5 Create `knowledge/psadt/best-practices.md` - Recommended patterns
- [x] 2.6 Create `knowledge/installers/msi.md` - MSI packaging guide
- [x] 2.7 Create `knowledge/installers/exe.md` - EXE installer types guide
- [x] 2.8 Create `knowledge/installers/msix.md` - MSIX/AppX guide
- [x] 2.9 Create `knowledge/patterns/detection.md` - Detection rule patterns
- [x] 2.10 Create `knowledge/patterns/prerequisites.md` - Prerequisites handling
- [x] 2.11 Create `knowledge/reference/exit-codes.md` - Common exit codes

## 3. Template Files
- [x] 3.1 Create base template structure with Handlebars
- [x] 3.2 Create `templates/msi-basic.hbs` - Basic MSI template
- [x] 3.3 Create `templates/msi-standard.hbs` - Standard MSI template
- [x] 3.4 Create `templates/msi-advanced.hbs` - Advanced MSI template
- [x] 3.5 Create `templates/exe-basic.hbs` - Basic EXE template
- [x] 3.6 Create `templates/exe-standard.hbs` - Standard EXE template
- [x] 3.7 Create `templates/exe-advanced.hbs` - Advanced EXE template
- [x] 3.8 Create `templates/msix.hbs` - MSIX template
- [x] 3.9 Create `templates/zip.hbs` - ZIP extraction template

## 4. PSADT Service
- [x] 4.1 Create `services/psadt.ts` service class
- [x] 4.2 Implement `generateScript()` method
- [x] 4.3 Implement template loading and caching
- [x] 4.4 Implement `getCustomizationPoints()` for generated scripts
- [x] 4.5 Add Handlebars helpers for common patterns

## 5. MCP Resources
- [x] 5.1 Register PSADT documentation resources (`psadt://docs/*`)
- [x] 5.2 Register installer guide resources (`kb://installers/*`)
- [x] 5.3 Register pattern resources (`kb://patterns/*`)
- [x] 5.4 Register reference resources (`ref://exit-codes`)
- [x] 5.5 Implement resource content loading in `handlers/resources.ts`

## 6. MCP Tool
- [x] 6.1 Register `get_psadt_template` tool in handlers
- [x] 6.2 Implement tool handler with input validation
- [x] 6.3 Return template with file structure and customization points

## 7. Testing
- [x] 7.1 Unit tests for template generation (all installer types)
- [x] 7.2 Unit tests for template variable substitution
- [x] 7.3 Validate generated scripts are syntactically valid PowerShell
- [x] 7.4 Test resource loading for all URIs

## 8. Documentation
- [x] 8.1 Document `get_psadt_template` tool parameters
- [x] 8.2 Document available complexity levels
- [x] 8.3 Document customization points system
