#!/usr/bin/env python3
"""
Subset the Material Symbols font to only the glyphs used in the app.

Two sources of icon names are merged:
  * ICON_MAP in src/components/Icon.tsx — every icon rendered by <Icon>
    resolves to a Unicode code point listed there.
  * MATERIAL_SYMBOLS in AdminBooksPage/components/BookEditModal.tsx —
    icons selectable in the admin panel (book contextChain, etc.).

Using fontTools.subset instead of manual glyf surgery: deleting glyphs from
the `glyf` table by hand without updating `hmtx`/`loca` corrupts the outlines,
which made icons render off-center inside round buttons.

Usage:
    python3 subset-material-symbols.py input.woff2 output.woff2
"""

import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

PROJECT_DIR = Path(__file__).resolve().parent.parent
ICON_TSX = PROJECT_DIR / "src" / "components" / "Icon.tsx"
ADMIN_MODAL_TSX = (
    PROJECT_DIR / "src" / "pages" / "AdminBooksPage" / "components" / "BookEditModal.tsx"
)

# \uXXXX entries of ICON_MAP
ICON_RE = re.compile(r"(\w+):\s*\"\\u([0-9A-Fa-f]{4})\"")
# const MATERIAL_SYMBOLS = ["icon_name", ...]
ADMIN_ICONS_RE = re.compile(r"const MATERIAL_SYMBOLS = \[(.*?)\]", re.S)
ICON_NAME_RE = re.compile(r'"([a-z0-9_]+)"')


def read_icon_map() -> dict[str, int]:
    src = ICON_TSX.read_text(encoding="utf-8")
    icon_map = {name: int(code, 16) for name, code in ICON_RE.findall(src)}
    if not icon_map:
        sys.exit(f"Error: no \\uXXXX icon mappings found in {ICON_TSX}")
    return icon_map


def read_admin_icon_names() -> set[str]:
    src = ADMIN_MODAL_TSX.read_text(encoding="utf-8")
    match = ADMIN_ICONS_RE.search(src)
    if not match:
        sys.exit(f"Error: MATERIAL_SYMBOLS not found in {ADMIN_MODAL_TSX}")
    return set(ICON_NAME_RE.findall(match.group(1)))


def resolve_admin_codepoints(
    font: TTFont, names: set[str]
) -> tuple[set[int], set[str]]:
    """Map admin icon names to code points via glyph names in the source font."""
    glyph_to_codepoint = {
        glyph_name: codepoint
        for codepoint, glyph_name in (font.getBestCmap() or {}).items()
    }
    codepoints: set[int] = set()
    missing: set[str] = set()
    for name in names:
        codepoint = glyph_to_codepoint.get(name)
        if codepoint is None:
            missing.add(name)
        else:
            codepoints.add(codepoint)
    return codepoints, missing


def subset_font(input_path: str, output_path: str) -> None:
    font = TTFont(input_path)

    icon_map = read_icon_map()
    codepoints = set(icon_map.values())
    admin_names = read_admin_icon_names()
    admin_codepoints, missing_admin = resolve_admin_codepoints(font, admin_names)
    codepoints |= admin_codepoints

    if missing_admin:
        print(
            "Warning: admin icons not found in the source font: "
            + ", ".join(sorted(missing_admin))
        )

    # Icons selectable in the admin panel must also exist in ICON_MAP,
    # otherwise <Icon> cannot render them.
    not_in_icon_map = admin_names - icon_map.keys()
    if not_in_icon_map:
        print(
            "Warning: admin icons missing from ICON_MAP (src/components/Icon.tsx): "
            + ", ".join(sorted(not_in_icon_map))
        )

    options = subset.Options()
    # Ligatures are not used: icons are rendered by code point.
    options.layout_features = []
    # Font hinting is not needed for screen rendering and bloats the file.
    options.hinting = False
    options.flavor = "woff2"
    # Remove variable font tables (not needed for static outlined icons, saves ~80KB).
    options.drop_tables += ["gvar", "HVAR", "VVAR", "MVAR", "avar", "fvar"]

    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=codepoints)
    subsetter.subset(font)

    font.flavor = "woff2"
    font.save(output_path)

    cmap = font.getBestCmap() or {}
    missing = sorted(cp for cp in codepoints if cp not in cmap)
    if missing:
        print(
            "Warning: code points missing in the source font: "
            + ", ".join(f"U+{cp:04X}" for cp in missing)
        )

    original_size = Path(input_path).stat().st_size
    new_size = Path(output_path).stat().st_size
    print(f"ICON_MAP code points: {len(icon_map)}")
    print(f"Admin panel icons: {len(admin_names)} ({len(admin_codepoints)} resolved)")
    print(f"Total code points in subset: {len(codepoints)}")
    print(f"Glyphs in subset: {len(font.getGlyphOrder())}")
    print(f"Original: {original_size // 1024}KB")
    print(f"Subset: {new_size // 1024}KB")
    print(f"Saved: {(original_size - new_size) // 1024}KB")
    print(f"Reduction: {100 - (new_size * 100 // original_size)}%")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} input.woff2 output.woff2")
        sys.exit(1)
    subset_font(sys.argv[1], sys.argv[2])
