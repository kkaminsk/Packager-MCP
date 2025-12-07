## 1. Type Definitions
- [ ] 1.1 Create `types/psadt.ts` with template types (TemplateOptions, TemplateOutput, CustomizationPoint)
- [ ] 1.2 Add input/output types for `get_psadt_template` tool

## 2. Knowledge Base Content
- [ ] 2.1 Create `knowledge/psadt/overview.md` - PSADT v4 architecture
- [ ] 2.2 Create `knowledge/psadt/functions.md` - Function reference (ADT-prefixed)
- [ ] 2.3 Create `knowledge/psadt/variables.md` - Built-in variables ($ADTSession, etc.)
- [ ] 2.4 Create `knowledge/psadt/migration.md` - v3 to v4 migration guide
- [ ] 2.5 Create `knowledge/psadt/best-practices.md` - Recommended patterns
- [ ] 2.6 Create `knowledge/installers/msi.md` - MSI packaging guide
- [ ] 2.7 Create `knowledge/installers/exe.md` - EXE installer types guide
- [ ] 2.8 Create `knowledge/installers/msix.md` - MSIX/AppX guide
- [ ] 2.9 Create `knowledge/patterns/detection.md` - Detection rule patterns
- [ ] 2.10 Create `knowledge/patterns/prerequisites.md` - Prerequisites handling
- [ ] 2.11 Create `knowledge/reference/exit-codes.md` - Common exit codes

## 3. Template Files
- [ ] 3.1 Create base template structure with Handlebars
- [ ] 3.2 Create `templates/msi-basic.hbs` - Basic MSI template
- [ ] 3.3 Create `templates/msi-standard.hbs` - Standard MSI template
- [ ] 3.4 Create `templates/msi-advanced.hbs` - Advanced MSI template
- [ ] 3.5 Create `templates/exe-basic.hbs` - Basic EXE template
- [ ] 3.6 Create `templates/exe-standard.hbs` - Standard EXE template
- [ ] 3.7 Create `templates/exe-advanced.hbs` - Advanced EXE template
- [ ] 3.8 Create `templates/msix.hbs` - MSIX template
- [ ] 3.9 Create `templates/zip.hbs` - ZIP extraction template

## 4. PSADT Service
- [ ] 4.1 Create `services/psadt.ts` service class
- [ ] 4.2 Implement `generateScript()` method
- [ ] 4.3 Implement template loading and caching
- [ ] 4.4 Implement `getCustomizationPoints()` for generated scripts
- [ ] 4.5 Add Handlebars helpers for common patterns

## 5. MCP Resources
- [ ] 5.1 Register PSADT documentation resources (`psadt://docs/*`)
- [ ] 5.2 Register installer guide resources (`kb://installers/*`)
- [ ] 5.3 Register pattern resources (`kb://patterns/*`)
- [ ] 5.4 Register reference resources (`ref://exit-codes`)
- [ ] 5.5 Implement resource content loading in `handlers/resources.ts`

## 6. MCP Tool
- [ ] 6.1 Register `get_psadt_template` tool in handlers
- [ ] 6.2 Implement tool handler with input validation
- [ ] 6.3 Return template with file structure and customization points

## 7. Testing
- [ ] 7.1 Unit tests for template generation (all installer types)
- [ ] 7.2 Unit tests for template variable substitution
- [ ] 7.3 Validate generated scripts are syntactically valid PowerShell
- [ ] 7.4 Test resource loading for all URIs

## 8. Documentation
- [ ] 8.1 Document `get_psadt_template` tool parameters
- [ ] 8.2 Document available complexity levels
- [ ] 8.3 Document customization points system
