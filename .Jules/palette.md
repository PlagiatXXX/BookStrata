# Palette's Journal

## 2025-05-15 - [Initial Assessment]
**Learning:** Found that core interactive components (like LikeButton) are missing essential ARIA attributes (label, pressed) and lack tactile feedback, which is critical for accessible and delightful interactions.
**Action:** Enhance LikeButton with ARIA labels, focus-visible states, and scale transitions.

## 2025-05-22 - [Inconsistent Feedback & Modal Accessibility]
**Learning:** The application uses the `sileo` notification library, yet several core modules (like Dashboard) still rely on blocking native `alert()` calls for validation and API errors. This creates a jarring and inconsistent UX. Additionally, many modal inputs lack visible labels, which is a common accessibility gap in this app.
**Action:** Replace `alert()` with `sileo.error` across the Dashboard module and ensure every modal input has a properly associated `<label>` with a visual "required" indicator (`*`) when applicable.
