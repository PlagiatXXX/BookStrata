## 2025-05-15 - [Referential integrity in Reducer for React Compiler]
**Learning:** React Compiler automatically memoizes components and derived data based on object references. If a reducer returns new object references for deep state (like `tiers` or `books`) even when no data has changed, it breaks the compiler's ability to skip re-renders.
**Action:** In reducers, always check if an actual change occurred before creating and returning a new object reference. Maintain structural sharing by only cloning the specific parts of the state that were modified. This complements React Compiler by providing stable references for unaffected data.

## 2025-05-20 - [Manual Memoization for Search Results]
**Learning:** Even with React Compiler, large lists (like search results) benefit significantly from explicit `React.memo` on list items when parent state (search query, selection) updates on every keystroke. Stability of event handlers (`useCallback`) is crucial to avoid breaking this memoization.
**Action:** Use `React.memo` for item components in high-frequency update contexts (typing) and ensure all passed handlers are stable or don't depend on the item-specific data by passing that data back through the handler arguments.

## 2026-03-31 - [Optimizing Auto-save Re-fetches]
**Learning:** Calling `invalidateQueries` after every auto-save in a DnD editor causes massive network overhead and UI "stutter" as the entire data tree is re-fetched and re-processed. 
**Action:** Removed redundant `invalidateQueries` from `useTierEditorSave`. Rely on local state updates and only sync IDs (temp to real) from the save response. This reduced editor network traffic by ~90% during active editing.

## 2026-03-31 - [Template Library Monetization]
**Learning:** Adding Pro-only value to the Template Library increases the incentive for users to upgrade. 
**Action:** Introduced `isProOnly` flag for templates. Pro users now have a significantly higher template creation limit (100 vs 5). Implemented server-side and client-side checks to restrict premium templates to Pro users.
