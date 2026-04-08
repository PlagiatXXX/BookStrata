# Palette's Journal - UX & Accessibility Learnings

## 2025-05-15 - Discovering Inaccessible Tier Actions
**Learning:** Hover-only action containers (like the one in `TierRow` or the Palette button in `TierLabel`) are invisible to keyboard users and screen readers unless they have `focus-within:opacity-100` or similar mechanisms. Additionally, icon-only buttons without `aria-label` provide no context to screen reader users.
**Action:** Always ensure that hidden-by-default action containers use `focus-within` to remain visible when a child is focused, and verify all icon-only buttons have descriptive `aria-label` attributes and clear `focus-visible` styles.

## 2025-05-15 - [Hidden-on-hover accessibility pattern]
**Learning:** In a Neo-Brutalist design where actions are often hidden by default (`opacity-0`) and revealed on hover to reduce visual noise, keyboard-only users and screen readers are effectively locked out of these features. Relying solely on `group-hover:opacity-100` is insufficient for accessibility.
**Action:** Always complement `group-hover:opacity-100` with `focus-within:opacity-100` on the parent container (e.g., `TierRow`, `TierLabel`, `BookCover`) and ensure child buttons have `focus-visible` ring indicators. This preserves the clean "hover-only" visual aesthetic for mouse users while ensuring full discoverability and interaction for keyboard navigation.

## 2026-05-15 - [Accessible Auth Input Patterns]
**Learning:** For glassmorphism-style inputs without native borders, a sibling `span` with `peer-focus:scale-x-100` provides a high-contrast, accessible focus indicator that meets accessibility standards while maintaining the aesthetic.
**Action:** Use the `peer` class on inputs with an absolute sibling `span` for focus states in all glass-style forms to ensure keyboard users have clear visual feedback.
