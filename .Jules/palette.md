## 2025-05-15 - [Consistent ARIA Localization]
**Learning:** In applications localized for a specific language (e.g., Russian), ARIA labels for icon-only buttons and interactive elements must also be localized to match the UI language. Mixing English `aria-label` values with a Russian interface creates a confusing and non-inclusive experience for screen-reader users.
**Action:** Always check the primary language of the UI and existing placeholders (like "Поиск") before adding or updating ARIA attributes. Use localized labels that match the context and terminology used elsewhere in the app.
