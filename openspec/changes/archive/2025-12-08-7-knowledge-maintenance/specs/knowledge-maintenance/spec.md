# Specification: Knowledge Base Maintenance

## Requirements

### Requirement: Reference Knowledge Source
The system SHALL use `ReferenceKnowledge/` as the authoritative source for PSADT documentation.

#### Scenario: V4 documentation source
- **GIVEN** the `ReferenceKnowledge/V4DOCS.md` file exists
- **WHEN** updating `src/knowledge/psadt/` files
- **THEN** content SHALL be extracted and curated from `V4DOCS.md`

#### Scenario: V3 documentation for migration
- **GIVEN** the `ReferenceKnowledge/V3DOCS.md` file exists
- **WHEN** updating `src/knowledge/psadt/migration.md`
- **THEN** content SHALL compare V3 and V4 patterns from both reference docs

#### Scenario: Examples for best practices
- **GIVEN** the `ReferenceKnowledge/Examples/` folder contains real-world scripts
- **WHEN** updating `src/knowledge/psadt/best-practices.md`
- **THEN** patterns SHALL be derived from working example scripts

#### Scenario: Source reference tracking
- **WHEN** a knowledge file is updated from reference material
- **THEN** the frontmatter SHALL include `source_ref` pointing to the reference location

### Requirement: Knowledge Versioning
The system SHALL track the target PSADT version for the knowledge base.

#### Scenario: Version file existence
- **WHEN** the system is built
- **THEN** a `VERSION` file SHALL exist in the knowledge root
- **AND** it SHALL contain the semantic version of the target PSADT release

#### Scenario: File metadata
- **WHEN** a knowledge file is processed
- **THEN** it SHALL contain YAML frontmatter
- **AND** the frontmatter SHALL specify `psadt_target` version
- **AND** the frontmatter SHALL specify `last_updated` date

### Requirement: Knowledge Validation
The system SHALL provide tools to validate the integrity of the knowledge base.

#### Scenario: Link validation
- **WHEN** validation is run
- **THEN** all internal links between knowledge files SHALL resolve
- **AND** all image references SHALL exist

#### Scenario: Syntax validation
- **WHEN** validation is run
- **THEN** all markdown files SHALL pass linting rules
- **AND** all PowerShell code blocks SHALL be syntactically valid

### Requirement: Change Tracking
The system SHALL track changes to the knowledge base separately from code changes.

#### Scenario: Changelog updates
- **WHEN** knowledge content is modified
- **THEN** an entry SHALL be added to `knowledge/CHANGELOG.md`
- **AND** the entry SHALL categorize the change (Update, New, Fix)

## Maintenance Schedule

### Quarterly Review Process
1. **Update Reference**: Download latest PSADT docs to `ReferenceKnowledge/`
2. **Compare Changes**: Diff new V4DOCS.md against previous version
3. **Curate Updates**: Extract relevant changes into `src/knowledge/` files
4. **Add Examples**: Incorporate new real-world scripts into `Examples/`
5. **Verify Links**: Run link validator
6. **Test Examples**: Verify key code examples against current PSADT version
7. **Release**: Bump `knowledge/VERSION` if applicable

### Triggered Updates
- **Major PSADT Release**: Update `ReferenceKnowledge/V4DOCS.md`, then curate
- **New Example Script**: Add to `ReferenceKnowledge/Examples/`, extract patterns
- **Breaking Intune Change**: Immediate patch to relevant guides
