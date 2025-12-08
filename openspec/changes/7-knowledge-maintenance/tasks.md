# Tasks: Knowledge Base Maintenance

## 1. Reference Knowledge Structure
- [ ] 1.1 Verify `ReferenceKnowledge/V4DOCS.md` is current with latest PSADT release
- [ ] 1.2 Verify `ReferenceKnowledge/V3DOCS.md` is complete for migration reference
- [ ] 1.3 Organize `ReferenceKnowledge/Examples/` with clear folder structure
- [ ] 1.4 Create `ReferenceKnowledge/README.md` documenting source and update process

## 2. Curated Knowledge Structure
- [ ] 2.1 Create `src/knowledge/VERSION` file
- [ ] 2.2 Create `src/knowledge/CHANGELOG.md` template
- [ ] 2.3 Create `src/knowledge/CONTRIBUTING.md` guide
- [ ] 2.4 Update existing markdown files with YAML frontmatter (including `source_ref`)

## 3. Content Curation
- [ ] 3.1 Extract `psadt/overview.md` content from `V4DOCS.md`
- [ ] 3.2 Extract `psadt/functions.md` content from `V4DOCS.md`
- [ ] 3.3 Extract `psadt/variables.md` content from `V4DOCS.md`
- [ ] 3.4 Create `psadt/migration.md` by comparing `V3DOCS.md` and `V4DOCS.md`
- [ ] 3.5 Derive `psadt/best-practices.md` patterns from `Examples/`

## 4. Validation Tools
- [ ] 4.1 Set up `markdownlint` configuration
- [ ] 4.2 Implement link checker script
- [ ] 4.3 Implement frontmatter validation script (including `source_ref`)
- [ ] 4.4 Implement PowerShell syntax validator for code blocks

## 5. Automation
- [ ] 5.1 Create GitHub Action/script for knowledge validation
- [ ] 5.2 Add validation step to main build pipeline

## 6. Documentation
- [ ] 6.1 Document the quarterly review process (ReferenceKnowledge → src/knowledge)
- [ ] 6.2 Create template for knowledge base issues/requests
- [ ] 6.3 Document how to add new examples to `ReferenceKnowledge/Examples/`
