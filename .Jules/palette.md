# Palette's Journal

## 2025-05-15 - [Initial Assessment]
**Learning:** Found that core interactive components (like LikeButton) are missing essential ARIA attributes (label, pressed) and lack tactile feedback, which is critical for accessible and delightful interactions.
**Action:** Enhance LikeButton with ARIA labels, focus-visible states, and scale transitions.

## 2026-03-24 - [Modal Auto-focus Pattern]
**Learning:** Implementing `autoFocus` on the primary input of a modal (e.g., search or edit) significantly reduces interaction friction by eliminating the need for an initial click.
**Action:** Always apply `autoFocus` to the main interactive element when creating new modals or forms in this design system.

## 2026-03-24 - [Responsive Search Form Layout]
**Learning:** When using a responsive form that switches to `flex-col` on mobile, absolutely positioned icons within the search input (like a Clear button) can misalign if they are children of the form container instead of a nested `relative` wrapper for the input itself.
**Action:** Always wrap the search input and its associated icons in a shared `relative` container to maintain vertical alignment across all breakpoints.
