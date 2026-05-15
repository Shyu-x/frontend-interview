#!/usr/bin/env node
/**
 * Mermaid Diagram Validator
 *
 * Validates all Mermaid diagrams in markdown files.
 * Usage: node scripts/validate-mermaid.js [path]
 */

const fs = require('fs');
const path = require('path');

const MERMAID_EXTENSIONS = ['.mmd', '.mermaid'];
const MD_EXTENSIONS = ['.md'];

class MermaidValidator {
    constructor(options = {}) {
        this.options = {
            strict: false,
            ignorePatterns: [],
            ...options
        };
        this.stats = {
            total: 0,
            valid: 0,
            errors: [],
            warnings: []
        };
    }

    /**
     * Extract Mermaid diagrams from markdown content
     */
    extractDiagrams(content, filename) {
        const diagrams = [];
        const regex = /```mermaid\s*([\s\S]*?)```/g;
        let match;

        while ((match = regex.exec(content)) !== null) {
            const diagram = match[1].trim();
            const lineNumber = content.substring(0, match.index).split('\n').length;
            diagrams.push({
                content: diagram,
                line: lineNumber,
                filename
            });
        }

        return diagrams;
    }

    /**
     * Validate a single Mermaid diagram
     */
    validateDiagram(diagram) {
        const errors = [];
        const warnings = [];

        // Basic syntax validation
        const content = diagram.content;

        // Check for empty diagrams
        if (!content || content.length === 0) {
            errors.push({ type: 'empty', message: 'Empty diagram' });
            return { valid: false, errors, warnings };
        }

        // Detect diagram type
        const firstLine = content.split('\n')[0].trim();
        const diagramTypes = [
            'flowchart', 'graph', 'pie', 'gantt', 'classDiagram', 'class',
            'stateDiagram', 'state', 'sequenceDiagram', 'sequence',
            'erDiagram', 'er', 'journey', 'requirementDiagram', 'requirement',
            'timeline', 'mindmap', 'block', 'blockDiagram', 'table', 'C4Context'
        ];

        const isValidType = diagramTypes.some(type =>
            firstLine.startsWith(type) || firstLine === 'graph'
        );

        if (!isValidType) {
            warnings.push({
                type: 'unknownType',
                message: `Could not detect diagram type from: "${firstLine}"`
            });
        }

        // Check for common issues
        this.checkNodeDefinitions(content, errors, warnings);
        this.checkSpecialCharacters(content, errors, warnings);
        this.checkSubgraphSyntax(content, errors, warnings);
        this.checkArrowSyntax(content, errors, warnings);

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Check node definitions
     */
    checkNodeDefinitions(content, errors, warnings) {
        // Check for nodes with invalid characters
        const nodePattern = /([A-Za-z0-9_]+)\[([^\]]+)\]/g;
        let match;

        while ((match = nodePattern.exec(content)) !== null) {
            const nodeId = match[1];
            const nodeText = match[2];

            // Check for empty node text
            if (!nodeText.trim()) {
                warnings.push({
                    type: 'emptyNode',
                    message: `Node "${nodeId}" has empty text`
                });
            }
        }

        // Check for nodes without brackets (simple nodes)
        const simpleNodePattern = /\b([A-Za-z][A-Za-z0-9_]*)\s*(-->?|---)\s*([A-Za-z][A-Za-z0-9_]*)\b/g;
        // Just a warning check, not an error
    }

    /**
     * Check for special character issues
     */
    checkSpecialCharacters(content, errors, warnings) {
        // Check for unescaped HTML characters that could cause issues
        // Note: Mermaid uses <br/> and </xxx> for formatting, so we need to be careful
        // The common patterns like >" in arrows (-->") and < in </end> are valid Mermaid syntax

        // Check for truly problematic HTML (like <script> or unclosed tags)
        const scriptPattern = /<script[^>]*>/gi;
        const unclosedTags = /<[a-z][^>]*[^/>](?<!br)(?<!hr)(?<!img)(?<!input)(?<!meta)(?<!link)(?<!area)(?<!base)(?<!col)(?<!embed)(?<!param)(?<!source)(?<!track)(?<!wbr)>/gi;

        if (scriptPattern.test(content)) {
            warnings.push({
                type: 'dangerousHtml',
                message: 'Found potentially dangerous <script> tags in diagram'
            });
        }

        // Check for problematic unescaped angle brackets (not in valid Mermaid constructs)
        // This catches actual HTML that might break rendering
        const problematicBrackets = /(?<![<>/\w-])(?<!<br)(?<!<\/)(?<!<s)(?<!<\/s)(?<!<e)(?<!<\/e)(?<!<t)(?<!<\/t)<(?!br|\/|s|e|t)[a-z]+/gi;
        const matches = content.match(problematicBrackets);

        if (matches && matches.length > 0) {
            warnings.push({
                type: 'specialChars',
                message: `Found potentially unescaped HTML tags: ${matches.slice(0, 3).join(', ')}`
            });
        }
    }

    /**
     * Check subgraph syntax
     */
    checkSubgraphSyntax(content, errors, warnings) {
        // Only check for subgraph/end mismatches if we're in a flowchart or graph
        const firstLine = content.split('\n')[0].trim();

        // Only flowchart types use subgraph...end pairs
        if (firstLine.startsWith('flowchart') || firstLine.startsWith('graph')) {
            // Count subgraph openings - must be at start of line or after -->
            const openMatches = content.match(/(?:^|\n)\s*subgraph\s+/gm) || [];
            const openCount = openMatches.length;

            // Count end statements - must be on its own line or after -->
            // We look for 'end' that appears at the start of a line or after arrow syntax
            const endMatches = content.match(/(?:^|\n\s*|-->)\s*end\b/gm) || [];
            const closeCount = endMatches.length;

            if (openCount !== closeCount) {
                errors.push({
                    type: 'subgraphMismatch',
                    message: `Subgraph mismatch: ${openCount} opening, ${closeCount} closing`
                });
            }
        }
        // For other diagram types (sequenceDiagram, etc.), end statements are
        // for rect, loop, opt, alt, etc. blocks, not subgraph, so we skip checking
    }

    /**
     * Check arrow syntax
     */
    checkArrowSyntax(content, errors, warnings) {
        // Check for potentially invalid arrows
        const invalidArrowPattern = /--+[^>-]+>/g;
        const matches = content.match(invalidArrowPattern);

        if (matches) {
            warnings.push({
                type: 'unusualArrow',
                message: `Unusual arrow syntax: ${matches.slice(0, 3).join(', ')}${matches.length > 3 ? '...' : ''}`
            });
        }
    }

    /**
     * Validate a file
     */
    validateFile(filepath) {
        try {
            const content = fs.readFileSync(filepath, 'utf-8');
            const diagrams = this.extractDiagrams(content, filepath);

            for (const diagram of diagrams) {
                this.stats.total++;
                const result = this.validateDiagram(diagram);

                if (result.valid) {
                    this.stats.valid++;
                } else {
                    this.stats.errors.push({
                        file: diagram.filename,
                        line: diagram.line,
                        errors: result.errors
                    });
                }

                if (result.warnings.length > 0 && this.options.strict) {
                    this.stats.warnings.push({
                        file: diagram.filename,
                        line: diagram.line,
                        warnings: result.warnings
                    });
                }
            }
        } catch (err) {
            console.error(`Error reading ${filepath}: ${err.message}`);
        }
    }

    /**
     * Find and validate all files
     */
    validateDirectory(dirpath) {
        const files = [];

        const findFiles = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    // Skip node_modules, .git, etc.
                    if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) {
                        findFiles(fullPath);
                    }
                } else if (entry.isFile() && MD_EXTENSIONS.includes(path.extname(entry.name))) {
                    // Check ignore patterns
                    const shouldIgnore = this.options.ignorePatterns.some(pattern =>
                        fullPath.includes(pattern)
                    );

                    if (!shouldIgnore) {
                        files.push(fullPath);
                    }
                }
            }
        };

        try {
            findFiles(dirpath);
        } catch (err) {
            console.error(`Error reading directory ${dirpath}: ${err.message}`);
        }

        for (const file of files) {
            this.validateFile(file);
        }
    }

    /**
     * Print results
     */
    printResults() {
        console.log('\n=== Mermaid Validation Results ===\n');

        if (this.stats.total === 0) {
            console.log('No Mermaid diagrams found.');
            return;
        }

        console.log(`Total diagrams: ${this.stats.total}`);
        console.log(`Valid diagrams: ${this.stats.valid}`);
        console.log(`Invalid diagrams: ${this.stats.errors.length}`);

        if (this.stats.errors.length > 0) {
            console.log('\n--- Errors ---');
            for (const error of this.stats.errors) {
                console.log(`\n${error.file}:${error.line}`);
                for (const err of error.errors) {
                    console.log(`  - [${err.type}] ${err.message}`);
                }
            }
        }

        if (this.options.strict && this.stats.warnings.length > 0) {
            console.log('\n--- Warnings ---');
            for (const warning of this.stats.warnings) {
                console.log(`\n${warning.file}:${warning.line}`);
                for (const warn of warning.warnings) {
                    console.log(`  - [${warn.type}] ${warn.message}`);
                }
            }
        }

        // Exit code
        const success = this.stats.errors.length === 0;
        console.log(`\n${success ? '✓' : '✗'} ${success ? 'All diagrams valid' : 'Some diagrams have errors'}`);

        return success;
    }
}

// Main execution
function main() {
    const args = process.argv.slice(2);
    let targetPath = process.cwd();

    if (args.length > 0) {
        targetPath = path.resolve(args[0]);
    }

    const strict = args.includes('--strict');

    console.log(`Validating Mermaid diagrams in: ${targetPath}`);
    console.log(`Strict mode: ${strict}`);

    const validator = new MermaidValidator({
        ignorePatterns: ['node_modules', '.git'],
        strict
    });

    const stats = fs.statSync(targetPath);

    if (stats.isDirectory()) {
        validator.validateDirectory(targetPath);
    } else {
        validator.validateFile(targetPath);
    }

    const success = validator.printResults();

    process.exit(success ? 0 : 1);
}

main();