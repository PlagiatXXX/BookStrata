## 2025-05-15 - [Referential integrity in Reducer for React Compiler]
**Learning:** React Compiler automatically memoizes components and derived data based on object references. If a reducer returns new object references for deep state (like `tiers` or `books`) even when no data has changed, it breaks the compiler's ability to skip re-renders.
**Action:** In reducers, always check if an actual change occurred before creating and returning a new object reference. Maintain structural sharing by only cloning the specific parts of the state that were modified. This complements React Compiler by providing stable references for unaffected data.

## 2026-03-28 - [Memoization of derived data in EditorMainContent]
**Learning:** Derived calculations (mapping IDs to objects, calculating lengths) in frequently re-rendering components like the Tier Editor should be memoized with `useMemo`.
**Action:** Use `useMemo` for any derived data that is passed as props to memoized children, especially when the parent re-renders due to local UI state like `activeTierId`.
