#!/usr/bin/env python3
"""
Subset Material Symbols font to only include needed glyphs.

This script:
1. Keeps all glyphs mapped in the cmap table (to avoid KeyError)
2. Removes GSUB table (ligature rules - not needed with Unicode code points)
3. Removes variable font tables (gvar, HVAR, fvar, avar, STAT)
4. Removes unused glyphs from glyf table

Usage:
    python3 subset-material-symbols.py input.woff2 output.woff2
"""

import sys
import os
from fontTools.ttLib import TTFont


def subset_font(input_path: str, output_path: str) -> None:
    """Subset the Material Symbols font."""
    font = TTFont(input_path)
    cmap = font.getBestCmap()

    if cmap is None:
        print("Error: No cmap table found in font")
        sys.exit(1)

    # Keep all glyphs that are in the cmap table
    # This ensures we don't break any existing mappings
    glyphs_to_keep = set(cmap.values())
    glyphs_to_keep.add('.notdef')  # Required glyph

    print(f"Cmap entries: {len(cmap)}")
    print(f"Glyphs to keep: {len(glyphs_to_keep)}")

    # Get all glyph names
    all_glyphs = set(font.getGlyphOrder())
    print(f"Total glyphs: {len(all_glyphs)}")

    # Glyphs to remove
    glyphs_to_remove = all_glyphs - glyphs_to_keep
    print(f"Glyphs to remove: {len(glyphs_to_remove)}")

    # Remove unused glyphs from glyf table
    if 'glyf' in font:
        glyf = font['glyf']
        for glyph in glyphs_to_remove:
            if glyph in glyf:
                del glyf[glyph]

    # Remove GSUB table (ligature rules - we use Unicode code points now)
    if 'GSUB' in font:
        del font['GSUB']
        print("Removed GSUB table")

    # Remove variable font tables
    tables_to_remove = ['gvar', 'HVAR', 'VVAR', 'STAT', 'avar', 'fvar']
    for table in tables_to_remove:
        if table in font:
            del font[table]
            print(f"Removed {table} table")

    # Save the subset
    font.save(output_path)

    # Report sizes
    original_size = os.path.getsize(input_path)
    new_size = os.path.getsize(output_path)
    print(f"\nOriginal: {original_size // 1024}KB")
    print(f"Subset: {new_size // 1024}KB")
    print(f"Saved: {(original_size - new_size) // 1024}KB")
    print(f"Reduction: {100 - (new_size * 100 // original_size)}%")


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} input.woff2 output.woff2")
        sys.exit(1)

    subset_font(sys.argv[1], sys.argv[2])
