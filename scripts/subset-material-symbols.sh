#!/bin/bash
# scripts/subset-material-symbols.sh
# Subsets Material Symbols font to only include needed glyphs
# Run after updating Icon component's ICON_MAP

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
INPUT_FONT="$PROJECT_DIR/public/fonts/material-symbols-outlined-latin-full.woff2"
OUTPUT_FONT="$PROJECT_DIR/public/fonts/material-symbols-outlined-latin.woff2"

# Check if input font exists
if [ ! -f "$INPUT_FONT" ]; then
    echo "Error: Input font not found at $INPUT_FONT"
    echo "Make sure to backup the original font first:"
    echo "  cp $OUTPUT_FONT $INPUT_FONT"
    exit 1
fi

echo "Subsetting Material Symbols font..."
echo "This removes GSUB ligature rules and variable font tables."

# Run Python script for subsetting
python3 "$SCRIPT_DIR/subset-material-symbols.py" "$INPUT_FONT" "$OUTPUT_FONT"

# Get file sizes
ORIGINAL_SIZE=$(stat -f%z "$INPUT_FONT" 2>/dev/null || stat --format=%s "$INPUT_FONT" 2>/dev/null)
NEW_SIZE=$(stat -f%z "$OUTPUT_FONT" 2>/dev/null || stat --format=%s "$OUTPUT_FONT" 2>/dev/null)

echo ""
echo "Done!"
echo "Original: $(( ORIGINAL_SIZE / 1024 ))KB"
echo "Subset: $(( NEW_SIZE / 1024 ))KB"
echo "Saved: $(( (ORIGINAL_SIZE - NEW_SIZE) / 1024 ))KB"
echo ""
echo "Next steps:"
echo "1. Test the font in browser"
echo "2. Commit changes: git add public/fonts/material-symbols-outlined-latin.woff2"
