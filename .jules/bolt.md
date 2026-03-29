## 2025-05-15 - [Referential integrity in Reducer for React Compiler]
**Learning:** React Compiler automatically memoizes components and derived data based on object references. If a reducer returns new object references for deep state (like `tiers` or `books`) even when no data has changed, it breaks the compiler's ability to skip re-renders.
**Action:** In reducers, always check if an actual change occurred before creating and returning a new object reference. Maintain structural sharing by only cloning the specific parts of the state that were modified. This complements React Compiler by providing stable references for unaffected data.

## 2025-05-20 - [Referential stability for memoized components]
**Learning:** Components wrapped in `React.memo` (or memoized by React Compiler) still re-render if any of their props change by reference. Passing inline arrow functions or newly created objects (like derived arrays) as props to these components completely bypasses memoization.
**Action:** Always wrap event handlers in `useCallback` and derived data (maps, filters, object transformations) in `useMemo` when they are passed down to memoized child components. This is especially critical in high-frequency interaction areas like drag-and-drop editors.
