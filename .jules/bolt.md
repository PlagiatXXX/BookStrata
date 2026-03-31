## 2025-05-15 - [Referential integrity in Reducer for React Compiler]
**Learning:** React Compiler automatically memoizes components and derived data based on object references. If a reducer returns new object references for deep state (like `tiers` or `books`) even when no data has changed, it breaks the compiler's ability to skip re-renders.
**Action:** In reducers, always check if an actual change occurred before creating and returning a new object reference. Maintain structural sharing by only cloning the specific parts of the state that were modified. This complements React Compiler by providing stable references for unaffected data.

## 2025-05-20 - [Manual Memoization for Search Results]
**Learning:** Even with React Compiler, large lists (like search results) benefit significantly from explicit `React.memo` on list items when parent state (search query, selection) updates on every keystroke. Stability of event handlers (`useCallback`) is crucial to avoid breaking this memoization.
**Action:** Use `React.memo` for item components in high-frequency update contexts (typing) and ensure all passed handlers are stable or don't depend on the item-specific data by passing that data back through the handler arguments.
