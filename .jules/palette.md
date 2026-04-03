## 2024-05-15 - [Initial Exploration]
**Learning:** Initial setup of Palette journal. The project uses React, Tailwind, and Radix-like UI components but mostly custom ones in `src/ui`.
**Action:** Always check for missing ARIA labels in icon-only buttons and ensure all inputs have associated labels.

## 2024-05-16 - [Tab Accessibility and Input Constraints]
**Learning:** Custom tab implementations often miss WAI-ARIA roles (`tablist`, `tab`), which prevents screen readers from announcing them as a group. Additionally, unconstrained AI prompt inputs can lead to silent backend failures if not mirrored with frontend counters.
**Action:** Standardize tabs with `role="tablist"` and `role="tab"`. Always provide a visual character counter for limited textareas to improve user predictability.
