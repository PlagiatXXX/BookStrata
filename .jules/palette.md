# Palette's Journal - UX & Accessibility Learnings

## 2025-05-15 - Standardizing Button Loading States
**Learning:** When adding a loading state to a button, replacing children with a spinner can cause layout shift if the spinner's dimensions differ from the text. Using `opacity-0` on children while absolute-positioning the spinner maintains the button's width/height, providing a smoother visual transition.
**Action:** Use the `isLoading` prop in `Button.tsx` which implements this "stable dimensions" pattern along with `aria-busy="true"` and `disabled` for accessibility.
