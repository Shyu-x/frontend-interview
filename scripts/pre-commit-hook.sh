#!/bin/bash
# Pre-commit hook to validate Mermaid diagrams and Markdown format
# Blocks commit if any error found
# NOTE: This file should be copied to .git/hooks/pre-commit

set -e

echo "🔍 Pre-commit validation starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Find all markdown files staged
MARKDOWN_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.md$' || true)

if [ -z "$MARKDOWN_FILES" ]; then
    echo "✓ No markdown files changed, skipping validation"
    exit 0
fi

echo "📝 Checking markdown files..."

for FILE in $MARKDOWN_FILES; do
    if [ ! -f "$FILE" ]; then
        continue
    fi

    FILE_ERRORS=0

    # === Mermaid Syntax Checks ===

    # Check 1: Bidirectional arrow syntax (<-> is invalid in Mermaid 11.x)
    if grep -q "<->" "$FILE"; then
        echo -e "${RED}✗ [Mermaid] Invalid bidirectional arrow <-> in: $FILE${NC}"
        echo "  Use <=> instead of <-> for bidirectional arrows"
        ERRORS=$((ERRORS + 1))
        FILE_ERRORS=$((FILE_ERRORS + 1))
    fi

    # Check 2: Mermaid diagrams with potential syntax issues
    if grep -q "```mermaid" "$FILE"; then
        node -e "
            const fs = require('fs');
            const content = fs.readFileSync('$FILE', 'utf-8');
            const regex = /\`\`\`mermaid\s*([\s\S]*?)\`\`\`/g;
            let match;
            let idx = 0;
            while ((match = regex.exec(content)) !== null) {
                const diagram = match[1].trim();
                const lines = diagram.split('\n');
                const type = lines[0].trim();

                if (/<->/.test(diagram)) {
                    console.error('ERROR: Invalid <-> arrow in $FILE diagram #' + (idx + 1));
                    process.exit(1);
                }

                idx++;
            }
            process.exit(0);
        " 2>/dev/null || {
            echo -e "${RED}✗ [Mermaid] Syntax error in: $FILE${NC}"
            ERRORS=$((ERRORS + 1))
            FILE_ERRORS=$((FILE_ERRORS + 1))
        }
    fi

    # === Frontmatter Checks ===

    # Check 3: Frontmatter format (no empty lines between opening ---)
    if head -5 "$FILE" | grep -qPzo '(?s)^\n---\n\n---'; then
        echo -e "${RED}✗ [Frontmatter] Bad format (empty line + duplicate ---) in: $FILE${NC}"
        ERRORS=$((ERRORS + 1))
        FILE_ERRORS=$((FILE_ERRORS + 1))
    fi

    # === Basic Markdown Format Checks ===

    # Check 4: No multiple H1 titles
    H1_COUNT=$(grep -c "^# " "$FILE" || true)
    if [ "$H1_COUNT" -gt 1 ]; then
        echo -e "${RED}✗ [Markdown] Multiple H1 titles ($H1_COUNT found) in: $FILE${NC}"
        ERRORS=$((ERRORS + 1))
        FILE_ERRORS=$((FILE_ERRORS + 1))
    fi

    # Check 5: Code blocks must specify language
    if grep -q "^\`\`\`$" "$FILE"; then
        echo -e "${YELLOW}⚠ [Markdown] Code block without language in: $FILE${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi

    if [ $FILE_ERRORS -eq 0 ]; then
        echo -e "${GREEN}✓ $FILE${NC}"
    fi
done

echo ""
echo "========================================"
echo -e "Validation Summary:"
echo -e "  ${RED}Errors: $ERRORS${NC}"
echo -e "  ${YELLOW}Warnings: $WARNINGS${NC}"
echo "========================================"

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Commit blocked due to $ERRORS error(s)${NC}"
    exit 1
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ Commit allowed with $WARNINGS warning(s)${NC}"
fi

echo -e "${GREEN}✓ All checks passed${NC}"
exit 0