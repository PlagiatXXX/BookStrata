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
    echo "Make sure material-symbols-outlined-latin-full.woff2 is present in public/fonts/."
    exit 1
fi

# Find python3 with fontTools and brotli
PYTHON_BIN=""
if python3 -c "import fontTools, brotli" 2>/dev/null; then
    PYTHON_BIN="python3"
elif [ -x "/opt/homebrew/bin/python3" ] && /opt/homebrew/bin/python3 -c "import fontTools, brotli" 2>/dev/null; then
    PYTHON_BIN="/opt/homebrew/bin/python3"
elif [ -x "/usr/local/bin/python3" ] && /usr/local/bin/python3 -c "import fontTools, brotli" 2>/dev/null; then
    PYTHON_BIN="/usr/local/bin/python3"
else
    echo "Error: Python 3 with 'fonttools' and 'brotli' is required."
    echo "Install dependencies: pip install fonttools brotli"
    exit 1
fi

echo "Subsetting Material Symbols font..."
echo "Keeps only glyphs mapped in src/components/Icon.tsx (ICON_MAP) and AdminBooksPage."

# Run Python script for subsetting
"$PYTHON_BIN" "$SCRIPT_DIR/subset-material-symbols.py" "$INPUT_FONT" "$OUTPUT_FONT"

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
