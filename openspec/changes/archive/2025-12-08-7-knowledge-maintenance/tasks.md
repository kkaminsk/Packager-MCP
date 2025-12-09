# Tasks: Knowledge Base Maintenance

## 1. Reference Knowledge Structure
- [x] 1.1 Verify `ReferenceKnowledge/V4DOCS.md` is current with latest PSADT release
- [x] 1.2 Verify `ReferenceKnowledge/V3DOCS.md` is complete for migration reference
- [x] 1.3 Organize `ReferenceKnowledge/Examples/` with clear folder structure
- [x] 1.4 Create `ReferenceKnowledge/README.md` documenting source and update process

## 2. Curated Knowledge Structure
- [x] 2.1 Create `src/knowledge/VERSION` file
- [x] 2.2 Create `src/knowledge/CHANGELOG.md` template
- [x] 2.3 Create `src/knowledge/CONTRIBUTING.md` guide
- [x] 2.4 Update existing markdown files with YAML frontmatter (including `source_ref`)

## 3. Content Curation
- [x] 3.1 Extract `psadt/overview.md` content from `V4DOCS.md`
- [x] 3.2 Extract `psadt/functions.md` content from `V4DOCS.md`
- [x] 3.3 Extract `psadt/variables.md` content from `V4DOCS.md`
- [x] 3.4 Create `psadt/migration.md` by comparing `V3DOCS.md` and `V4DOCS.md`
- [x] 3.5 Derive `psadt/best-practices.md` patterns from `Examples/`

## 4. Validation Tools
- [x] 4.1 Set up `markdownlint` configuration
- [x] 4.2 Implement link checker script
- [x] 4.3 Implement frontmatter validation script (including `source_ref`)
- [x] 4.4 Implement PowerShell syntax validator for code blocks

## 5. Automation
- [x] 5.1 Create GitHub Action/script for knowledge validation
- [x] 5.2 Add validation step to main build pipeline

## 6. Documentation
- [x] 6.1 Document the quarterly review process (ReferenceKnowledge → src/knowledge)
- [x] 6.2 Create template for knowledge base issues/requests
- [x] 6.3 Document how to add new examples to `ReferenceKnowledge/Examples/`
