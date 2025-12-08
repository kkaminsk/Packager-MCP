#!/usr/bin/env node

/**
 * Knowledge Base Validation Script
 *
 * Validates the knowledge base for:
 * - YAML frontmatter presence and required fields
 * - Internal link validity
 * - PowerShell code block syntax
 * - Markdown structure
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = path.resolve(__dirname, '../src/knowledge');

// Required frontmatter fields
const REQUIRED_FIELDS = ['title', 'id', 'psadt_target', 'last_updated', 'verified_by', 'source_ref', 'tags'];

// Validation results
const results = {
  errors: [],
  warnings: [],
  passed: 0,
  failed: 0
};

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content, filePath) {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!frontmatterMatch) {
    return null;
  }

  const yamlContent = frontmatterMatch[1];
  const frontmatter = {};

  // Simple YAML parsing for our use case
  const lines = yamlContent.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      let value = match[2].trim();
      // Handle quoted strings
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      // Handle arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      }
      frontmatter[match[1]] = value;
    }
  }

  return frontmatter;
}

/**
 * Validate frontmatter for a file
 */
function validateFrontmatter(filePath, content) {
  const relativePath = path.relative(KNOWLEDGE_DIR, filePath);
  const frontmatter = parseFrontmatter(content, filePath);

  if (!frontmatter) {
    results.errors.push({
      file: relativePath,
      type: 'frontmatter',
      message: 'Missing YAML frontmatter'
    });
    return false;
  }

  let valid = true;

  for (const field of REQUIRED_FIELDS) {
    if (!frontmatter[field]) {
      results.errors.push({
        file: relativePath,
        type: 'frontmatter',
        message: `Missing required field: ${field}`
      });
      valid = false;
    }
  }

  // Validate date format
  if (frontmatter.last_updated && !/^\d{4}-\d{2}-\d{2}$/.test(frontmatter.last_updated)) {
    results.errors.push({
      file: relativePath,
      type: 'frontmatter',
      message: `Invalid date format for last_updated: ${frontmatter.last_updated} (expected YYYY-MM-DD)`
    });
    valid = false;
  }

  // Validate psadt_target format
  if (frontmatter.psadt_target && !/^\d+\.\d+(\.\d+|\.x)$/.test(frontmatter.psadt_target)) {
    results.warnings.push({
      file: relativePath,
      type: 'frontmatter',
      message: `Unusual psadt_target format: ${frontmatter.psadt_target}`
    });
  }

  // Validate source_ref exists
  if (frontmatter.source_ref) {
    const refs = frontmatter.source_ref.split(',').map(s => s.trim());
    for (const ref of refs) {
      const refPath = ref.split('#')[0].trim();
      if (refPath && !refPath.startsWith('http')) {
        const fullRefPath = path.resolve(__dirname, '..', refPath);
        if (!fs.existsSync(fullRefPath)) {
          results.warnings.push({
            file: relativePath,
            type: 'source_ref',
            message: `Source reference path not found: ${refPath}`
          });
        }
      }
    }
  }

  return valid;
}

/**
 * Validate internal markdown links
 */
function validateLinks(filePath, content) {
  const relativePath = path.relative(KNOWLEDGE_DIR, filePath);
  const fileDir = path.dirname(filePath);

  // Match markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  let valid = true;

  while ((match = linkRegex.exec(content)) !== null) {
    const linkUrl = match[2];

    // Skip external links, anchors, and special protocols
    if (linkUrl.startsWith('http') || linkUrl.startsWith('#') || linkUrl.startsWith('mailto:')) {
      continue;
    }

    // Skip links that look like code references (contain $ or spaces without extension)
    if (linkUrl.includes('$') || (linkUrl.includes(' ') && !linkUrl.match(/\.\w+$/))) {
      continue;
    }

    // Remove anchor from path
    const linkPath = linkUrl.split('#')[0];

    // Only validate if it looks like a file path (has extension or starts with ./)
    if (linkPath && (linkPath.includes('.') || linkPath.startsWith('./'))) {
      const fullPath = path.resolve(fileDir, linkPath);
      if (!fs.existsSync(fullPath)) {
        results.warnings.push({
          file: relativePath,
          type: 'link',
          message: `Broken internal link: ${linkUrl}`
        });
        valid = false;
      }
    }
  }

  return valid;
}

/**
 * Basic PowerShell syntax validation for code blocks
 */
function validateCodeBlocks(filePath, content) {
  const relativePath = path.relative(KNOWLEDGE_DIR, filePath);
  const fileName = path.basename(filePath);

  // Skip v3 function checks for migration guide (it's showing v3 code intentionally)
  const isMigrationGuide = fileName === 'migration.md';

  // Match PowerShell code blocks
  const codeBlockRegex = /```powershell\r?\n([\s\S]*?)```/g;
  let match;
  let valid = true;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const code = match[1];

    // Check for common syntax issues
    const issues = [];

    // Unmatched braces
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push('Unmatched curly braces');
    }

    // Unmatched parentheses (excluding comments and strings is complex, so just warn)
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push('Unmatched parentheses');
    }

    // Check for deprecated v3 functions (should use ADT prefix in v4)
    // Skip this check for migration guide which intentionally shows v3 code
    if (!isMigrationGuide) {
      const v3Functions = [
        'Execute-Process', 'Execute-MSI', 'Show-InstallationWelcome',
        'Show-InstallationProgress', 'Exit-Script', 'Write-Log'
      ];
      for (const func of v3Functions) {
        if (code.includes(func)) {
          issues.push(`Contains v3 function '${func}' - should use ADT-prefixed version`);
        }
      }
    }

    if (issues.length > 0) {
      results.warnings.push({
        file: relativePath,
        type: 'code',
        message: `Code block issues: ${issues.join('; ')}`
      });
      valid = false;
    }
  }

  return valid;
}

/**
 * Process all markdown files in knowledge directory
 */
function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.name.endsWith('.md')) {
      // Skip CHANGELOG.md and CONTRIBUTING.md
      if (entry.name === 'CHANGELOG.md' || entry.name === 'CONTRIBUTING.md') {
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');

      let fileValid = true;
      fileValid = validateFrontmatter(fullPath, content) && fileValid;
      fileValid = validateLinks(fullPath, content) && fileValid;
      fileValid = validateCodeBlocks(fullPath, content) && fileValid;

      if (fileValid) {
        results.passed++;
      } else {
        results.failed++;
      }
    }
  }
}

/**
 * Main entry point
 */
function main() {
  console.log('Knowledge Base Validation');
  console.log('=========================\n');

  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    console.error(`Error: Knowledge directory not found: ${KNOWLEDGE_DIR}`);
    process.exit(1);
  }

  processDirectory(KNOWLEDGE_DIR);

  // Print results
  if (results.errors.length > 0) {
    console.log('ERRORS:');
    for (const error of results.errors) {
      console.log(`  [${error.type}] ${error.file}: ${error.message}`);
    }
    console.log();
  }

  if (results.warnings.length > 0) {
    console.log('WARNINGS:');
    for (const warning of results.warnings) {
      console.log(`  [${warning.type}] ${warning.file}: ${warning.message}`);
    }
    console.log();
  }

  console.log('SUMMARY:');
  console.log(`  Files passed: ${results.passed}`);
  console.log(`  Files with issues: ${results.failed}`);
  console.log(`  Total errors: ${results.errors.length}`);
  console.log(`  Total warnings: ${results.warnings.length}`);

  // Exit with error code if there are errors
  if (results.errors.length > 0) {
    process.exit(1);
  }

  console.log('\nValidation passed!');
}

main();
