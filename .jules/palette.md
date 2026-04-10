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

## 2026-04-18 - [Dashboard Keyboard Navigation Visibility]
**Learning:** Custom-styled dashboard components (filters, card titles with `role="button"`, and action icons) often lose their default browser focus indicators. On dark, gradient, or glass backgrounds, standard focus rings are hard to see.
**Action:** Implement high-contrast `focus-visible` indicators using a theme-consistent color (e.g., cyan `#06bcf9`) with a 2px offset. For interactive text/titles, ensure `border-radius` is applied to the element so the focus outline follows the expected shape.

## 2026-04-10 - [Accessible Keyboard Interaction for Tiers]
**Learning:** Custom interactive elements like tier labels in a grid often miss native accessibility features. Simply adding  is not enough; users need specific key handlers (Enter/Space) and translated ARIA labels to understand the purpose of hidden interactions like color picking.
**Action:** Always provide  handlers for custom role="button" elements, ensure  for items with background colors, and translate ARIA labels to the user's interface language for screen reader clarity.

## 2026-04-10 - [Accessible Keyboard Interaction for Tiers]
**Learning:** Custom interactive elements like tier labels in a grid often miss native accessibility features. Simply adding tabIndex is not enough; users need specific key handlers (Enter/Space) and translated ARIA labels to understand the purpose of hidden interactions like color picking.
**Action:** Always provide onKeyDown handlers for custom role="button" elements, ensure focus-visible:ring-inset for items with background colors, and translate ARIA labels to the user's interface language for screen reader clarity.

## 2026-04-10 - [Localized ARIA and Progress Feedback]
**Learning:** For interactive components with dynamic counts (like progress bars or book counters), `aria-valuenow` alone is insufficient for many screen reader users. Providing `aria-valuetext` with a localized string (e.g., "5 из 20 книг") provides immediate, understandable context without requiring the user to calculate the meaning of raw numbers.
**Action:** Always supplement progress indicators with `aria-valuetext` containing a human-readable summary of the state. Ensure all icon-only adjustment buttons have localized `aria-label` attributes and explicit `type="button"` to avoid unexpected form behavior.
