# Contributing to the Knowledge Base

This guide explains how to contribute to and maintain the Packager-MCP knowledge base.

## Knowledge Base Structure

```
ReferenceKnowledge/          # Source of truth (raw docs, examples)
├── V4DOCS.md                # Complete PSADT v4 documentation
├── V3DOCS.md                # PSADT v3 docs (migration reference)
└── Examples/                # Real-world deployment scripts

src/knowledge/               # Curated content (MCP resources)
├── VERSION                  # Target PSADT version
├── CHANGELOG.md             # Update history
├── CONTRIBUTING.md          # This file
├── psadt/                   # PSADT documentation
├── installers/              # Installer type guides
├── patterns/                # Packaging patterns
└── reference/               # Reference data
```

## Frontmatter Requirements

Every markdown file in `src/knowledge/` MUST include YAML frontmatter:

```yaml
---
title: "Display Title"
id: "unique-id-with-dashes"
psadt_target: "4.0.x"
last_updated: "YYYY-MM-DD"
verified_by: "maintainer"
source_ref: "ReferenceKnowledge/V4DOCS.md#section-name"
tags: ["tag1", "tag2", "tag3"]
---
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Human-readable title |
| `id` | Yes | Unique identifier (lowercase, dashes) |
| `psadt_target` | Yes | PSADT version this content applies to |
| `last_updated` | Yes | Date of last content update |
| `verified_by` | Yes | Who verified accuracy ("maintainer", "community", "automated") |
| `source_ref` | Yes | Path to source in ReferenceKnowledge/ |
| `tags` | Yes | Categorization tags (array) |

## Update Workflows

### Quarterly Review

1. Check for new PSADT releases at [GitHub](https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/releases)
2. Compare V4DOCS.md against upstream documentation
3. Update ReferenceKnowledge/ if changes found
4. Re-curate affected src/knowledge/ files
5. Update VERSION and CHANGELOG.md
6. Run validation tools
7. Submit PR for review

### Ad-hoc Corrections

1. Identify the error and its source
2. If error is in ReferenceKnowledge/, fix there first
3. Update the corresponding curated file
4. Add entry to CHANGELOG.md
5. Update `last_updated` in frontmatter
6. Run validation tools
7. Submit PR

### Adding New Content

1. Determine if content belongs in reference or curated docs
2. For patterns/examples: add to ReferenceKnowledge/Examples/
3. For curated content:
   - Create file with proper frontmatter
   - Link to source in `source_ref`
   - Add appropriate tags
   - Update CHANGELOG.md

## Content Guidelines

### Writing Style

- Use clear, concise technical language
- Prefer examples over lengthy explanations
- Include code blocks with syntax highlighting
- Use tables for structured data
- Link to related content where helpful

### Code Examples

Always use fenced code blocks with language specification:

````markdown
```powershell
# Good: Language specified
Start-ADTProcess -FilePath 'installer.exe' -Arguments '/S'
```
````

### Version Awareness

- Clearly indicate which PSADT version content applies to
- Mark deprecated features explicitly
- Note breaking changes between versions

## Quarterly Review Schedule

The knowledge base is reviewed quarterly to ensure alignment with upstream PSADT releases:

| Quarter | Review Month | Focus Areas |
|---------|--------------|-------------|
| Q1 | January | Full review, PSADT release notes |
| Q2 | April | Functions and variables update |
| Q3 | July | Examples and patterns review |
| Q4 | October | Migration guide and best practices |

### Quarterly Review Checklist

1. **Check PSADT Releases**
   - Visit https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/releases
   - Note any new versions since last review
   - Download latest documentation if changed

2. **Update Reference Knowledge**
   - Update `ReferenceKnowledge/V4DOCS.md` if new version
   - Add new examples to `ReferenceKnowledge/Examples/`
   - Update `ReferenceKnowledge/README.md` with date

3. **Re-curate Content**
   - Review each file in `src/knowledge/psadt/`
   - Update function references for new/changed functions
   - Update variable documentation
   - Refresh best practices from new examples

4. **Update Metadata**
   - Increment version in `src/knowledge/VERSION`
   - Add entry to `src/knowledge/CHANGELOG.md`
   - Update `last_updated` in all modified files

5. **Validate and Submit**
   - Run `npm run validate:knowledge`
   - Create PR with summary of changes
   - Tag PR with `knowledge-update` label

## Validation

Before submitting changes, run the validation tools:

```bash
# Run knowledge validation (checks frontmatter, links, code blocks)
npm run validate:knowledge
```

### Validation Rules

1. **Frontmatter**: All required fields present and valid
2. **Links**: Internal links resolve to existing files
3. **Code Blocks**: PowerShell syntax is valid
4. **Consistency**: Terms and function names match PSADT docs

## Pull Request Checklist

- [ ] Frontmatter is complete and valid
- [ ] `source_ref` points to valid source material
- [ ] `last_updated` date is current
- [ ] CHANGELOG.md updated
- [ ] Validation passes
- [ ] Content reviewed for technical accuracy

## Questions?

- Open an issue for content questions
- Check existing documentation in ReferenceKnowledge/
- Consult official PSADT docs at https://psappdeploytoolkit.com
