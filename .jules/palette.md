# 2026-04-03: Neo-Brutalist Design Implementation

## UX/A11y Learnings:
- **High Contrast Navigation**: Implementing 4px solid black borders (Impact Border Rule) significantly improves structural visibility in dark mode (#0e0e0e).
- **Hard Offsets over Shadows**: Using 4px/8px hard color-filled offsets instead of soft Gaussian blurs provides a more tactile and 'permanent' feel, aligning with the "Raw Editorial Archive" north star.
- **Micro-Interactions**: Instant Snap transitions (100ms) and slight rotations (±2°) on hover create a high-energy interactable surface that feels responsive without being 'polished'.
- **Typography for Cyrillic**: Space Grotesk's mechanical feel pairs well with Russian Cyrillic's weight, while Manrope ensures readability for dense metadata.
- **Strict Rectangularity**: Enforcing 0px border-radius across all components (including switches and buttons) creates a cohesive industrial aesthetic.
