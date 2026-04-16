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

## 2025-05-25 - [Cohesive Component Memoization in Community Page]
**Learning:** Performance in pages with high-frequency state updates (like search inputs) is best addressed by "tree-level" memoization. Wrapping all major siblings in `React.memo` prevents the entire component tree from re-rendering on every keystroke, which is more effective than optimizing just the search component itself.
**Action:** When a page has local state updated on every keystroke (e.g., `searchQuery`), proactively wrap all other large, non-dependent child components in `React.memo` to isolate them from the render churn.

## 2025-06-05 - [Reducer-Level Guards for Filter State]
**Learning:** In pages with multiple filter/sort/search inputs (like `DashboardPage`), the reducer can become a source of unnecessary renders if it doesn't verify if the new state actually differs from the old one. Simple equality checks for primitive filters (`search`, `sort`, `filter`) before returning a new state object prevent the entire hook-dependent tree from re-rendering.
**Action:** Implement "pre-flight" equality checks in reducers for UI filters to maintain referential integrity of the state object when no logical change occurs.

## 2026-04-06 - [Consolidated Likes Retrieval for Templates]
**Learning:** Using Prisma's `include: { _count: { select: { ... } } }` allows fetching related record counts in a single database query, significantly reducing overhead compared to manual `groupBy` or separate count queries for each item in a list.
**Action:** Prefer Prisma's native `_count` inclusion for fetching relational counts (likes, items, comments) instead of manual aggregation or separate queries to minimize database roundtrips and application-level mapping logic.

## 2026-04-07 - [Optimizing User Stats with Aggregation and Denormalization]
**Learning:** Combining multiple `count` and `sum` operations into a single `prisma.aggregate` call significantly reduces database roundtrips. Using denormalized fields (like `likesCount` on `TierList`) for these aggregations avoids expensive join-based counts on large relational tables.
**Action:** When fetching multiple aggregate statistics for an entity (like user stats), prioritize `prisma.aggregate` using denormalized fields to minimize query count and database load.

## 2026-04-08 - [Parallelizing Relational Inserts in Prisma Transactions]
**Learning:** Sequential `await` calls for record creation within a Prisma transaction create unnecessary roundtrip overhead. When creating a parent and its children, or cloning multiple independent records (like books during a fork), combining operations into nested `create` calls or using `Promise.all` with individual `create` calls significantly improves throughput.
**Action:** Replace sequential `for...of` loops that perform database writes with `Promise.all` or nested relational `create` operations to collapse O(N) sequential operations into O(1) database steps.

## 2026-04-09 - [Isolating dnd-kit Context for Drag Performance]
**Learning:** Consuming `useDndContext` in high-level components (like `TierRow` or `SortableBookCover`) causes the entire component tree to re-render on every mouse movement during a drag operation. This creates a massive performance bottleneck as the number of items grows.
**Action:** Extract drag-dependent logic (like insertion indicators or drop target styles) into small, specialized sub-components that consume `useDndContext` independently. This keeps the parent components stable and limits re-renders to only the affected visual indicators.

## 2026-04-09 - [Fine-grained Row Memoization in Grids]
**Learning:** In a grid where rows depend on a global dictionary of items, a simple `useMemo` depending on the whole dictionary will trigger re-renders for every row whenever *any* item in the dictionary changes.
**Action:** Implement row-level wrappers that memoize their own item lists. By spreading individual item references into the dependency array (or using a stable selector), you ensure that a row only re-renders if its specific items are updated, maintaining referential stability for the rest of the grid.

## 2026-04-10 - [Consolidated Relational Selects for Activity Status]
**Learning:** Checking existence of a relation (like 'isLiked') while fetching the entity's own data can be done in a single query using Prisma's `select` or `include` with a filtered relation. This avoids sequential DB roundtrips and application-level merging of results.
**Action:** When fetching an entity and a per-user status (like 'isLiked', 'isFollowing'), use a single Prisma query with a filtered relational select (`take: 1`) to minimize latency and database load.

## 2026-04-11 - [Parallelizing Independent Writes in Complex Transactions]
**Learning:** In complex transaction methods (like `saveAll`), sequential `await` calls for independent record creations or updates (tiers, books) create unnecessary latency. Parallelizing these operations with `Promise.all` significantly reduces the transaction duration.
**Action:** Identify independent database writes within transactions and execute them concurrently using `Promise.all` to optimize total I/O wait time.

## 2026-04-11 - [O(N) Complexity for Temporary ID Mapping]
**Learning:** Using `.find()` lookups on arrays to resolve temporary IDs during bulk persistence operations leads to O(N*M) algorithmic complexity.
**Action:** Always use a `Map` for O(1) lookups when resolving temporary-to-real ID mappings during bulk operations to ensure O(N+M) total complexity.
