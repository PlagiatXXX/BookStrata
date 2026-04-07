# Palette's Journal - UX & Accessibility Learnings

## 2025-05-15 - Discovering Inaccessible Tier Actions
**Learning:** Hover-only action containers (like the one in `TierRow` or the Palette button in `TierLabel`) are invisible to keyboard users and screen readers unless they have `focus-within:opacity-100` or similar mechanisms. Additionally, icon-only buttons without `aria-label` provide no context to screen reader users.
**Action:** Always ensure that hidden-by-default action containers use `focus-within` to remain visible when a child is focused, and verify all icon-only buttons have descriptive `aria-label` attributes and clear `focus-visible` styles.
