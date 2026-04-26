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

## 2026-05-20 - [Dynamic Status Accessibility]
**Learning:** Dynamic status indicators (like book counters) are often missed by screen readers when they update. Users relying on assistive technology may not realize they are approaching a system limit until an error occurs.
**Action:** Apply `aria-live="polite"` to containers holding dynamic count or status information to ensure updates are announced automatically.

## 2026-04-18 - [Dashboard Keyboard Navigation Visibility]
**Learning:** Custom-styled dashboard components (filters, card titles with `role="button"`, and action icons) often lose their default browser focus indicators. On dark, gradient, or glass backgrounds, standard focus rings are hard to see.
**Action:** Implement high-contrast `focus-visible` indicators using a theme-consistent color (e.g., cyan `#06bcf9`) with a 2px offset. For interactive text/titles, ensure `border-radius` is applied to the element so the focus outline follows the expected shape.

## 2026-04-10 - [Accessible Keyboard Interaction for Tiers]
**Learning:** Custom interactive elements like tier labels in a grid often miss native accessibility features. Simply adding  is not enough; users need specific key handlers (Enter/Space) and translated ARIA labels to understand the purpose of hidden interactions like color picking.
**Action:** Always provide  handlers for custom role="button" elements, ensure  for items with background colors, and translate ARIA labels to the user's interface language for screen reader clarity.

## 2026-04-10 - [Accessible Keyboard Interaction for Tiers]
**Learning:** Custom interactive elements like tier labels in a grid often miss native accessibility features. Simply adding tabIndex is not enough; users need specific key handlers (Enter/Space) and translated ARIA labels to understand the purpose of hidden interactions like color picking.
**Action:** Always provide onKeyDown handlers for custom role="button" elements, ensure focus-visible:ring-inset for items with background colors, and translate ARIA labels to the user's interface language for screen reader clarity.

## 2025-05-20 - [Enhanced Modal Accessibility & Keyboard UX]
**Learning:** Large forms within modals (like the Book Edit modal) benefit significantly from `Ctrl/Cmd + Enter` shortcuts and clear ARIA labeling. Standard focus rings often clash with dark Neo-Brutalist themes, necessitating custom `focus-visible` styles for discoverability.
**Action:** Implement `Ctrl + Enter` for primary modal actions, link titles with `aria-labelledby`, and use high-contrast `focus-visible:ring` (e.g., cyan/pink) on all interactive form elements to ensure accessibility without sacrificing the design aesthetic.

## 2026-04-20 - [Inconsistent UI Limits and Inaccessible Progress Bars]
**Learning:** Hardcoding limit values (like "10 books") in the UI leads to misleading user feedback when the system-wide constants differ (e.g., 20). Additionally, visual-only progress bars are non-perceivable by screen reader users without explicit ARIA roles.
**Action:** Always derive UI labels and progress logic from centralized `constants` to ensure consistency. Use `role="progressbar"` with `aria-valuenow`, `aria-valuemax`, and `aria-valuetext` (e.g., "5 из 20 книг") to provide semantic context for assistive technologies.

## 2026-04-21 - [Modal Accessibility & Focus Pattern]
**Learning:** For modal components, linking the `aria-labelledby` (via `titleId` prop) to the main heading's `id` ensures screen readers announce the modal's purpose immediately. Furthermore, using `autoFocus` on the primary action button within the modal provides instant keyboard interactivity and allows the default 'Enter' key behavior to work without needing complex global key listeners.
**Action:** Always establish `aria-labelledby` relationships in modals and use `autoFocus` on the most likely primary action to improve accessibility and keyboard efficiency.

## 2026-05-20 - [Dashboard Modal Accessibility & Safety Focus]
**Learning:** Linking modal titles to the container via `aria-labelledby` ensures screen readers announce the purpose immediately. For destructive actions (like deletion), applying `autoFocus` to the "Cancel" button instead of the "Delete" button provides a safety buffer against accidental "Enter" key presses.
**Action:** Use `titleId` on modals linked to heading `id`s, and prioritize safety by focusing the non-destructive action in confirmation dialogs.

## 2025-05-21 - [Search Modal Focus & Keyboard UX]
**Learning:** In complex search interfaces, clearing the query often results in focus loss or requires manual re-focusing, breaking the user's flow. Combining `useRef` for programmatic focus management with an `Escape` key listener creates a high-speed "search -> reset -> refine" loop that feels much more responsive to power users.
**Action:** Always implement programmatic re-focusing after "Clear" actions in search inputs and support `Escape` to clear text before closing the parent container.
