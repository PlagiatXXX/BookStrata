# Feature Unlock — временное отключение Pro-проверок

## Зачем

Все Pro-ограничения временно убраны, чтобы дать пользователям полный доступ ко всем функциям в период запуска (≈ 1 месяц).

Когда будешь готов вводить подписку — откати изменения из этого файла.

---

## Изменённые файлы и как вернуть как было

### 1. `backend/src/middleware/proLimit.ts`

**Было:** `checkProLimit` запрашивал БД и выставлял лимиты в зависимости от `isPro`.  
**Стало:** всегда `isPro: true`, `maxBooks: Infinity`, `maxTemplates: Infinity`, `maxExportResolution: "4K"`.

**Как вернуть:** заменить `checkProLimit` на оригинальную реализацию с запросом `subscriptionsService.isProUser()`.

---

**Было:** `requirePro` проверял `request.proLimit?.isPro` и возвращал 403.  
**Стало:** пустая функция `export const requirePro = async () => {}`.

**Как вернуть:** заменить на оригинальную реализацию с проверкой и 403.

---

### 2. `backend/src/modules/avatars/avatar.service.ts`

**Было:** в `checkAvatarLimit` и `getAvatarLimit` был запрос `subscriptionsService.isProUser(userId)` и выбор лимита (`DAILY_AVATAR_LIMIT_FREE = 0` или `DAILY_AVATAR_LIMIT_PRO = 50`).  
**Стало:** всегда `DAILY_AVATAR_LIMIT = 50`, без запроса `isProUser`. Убран импорт `SubscriptionsService`.

**Как вернуть:**
- Вернуть импорт `SubscriptionsService`
- Восстановить `DAILY_AVATAR_LIMIT_FREE = 0` и `DAILY_AVATAR_LIMIT_PRO = 50`
- В `checkAvatarLimit` и `getAvatarLimit` вернуть параллельный запрос `isProUser` и выбор лимита
- Параметр `userRole?: string` вернуть в функции и использовать для `hasAdminRole`

---

### 3. `backend/src/modules/avatars/avatar.route.ts`

**Было:** вызовы `generateAvatar(prompt.trim(), userId, userRole)` и `getAvatarLimit(userId, userRole)`.  
**Стало:** без `userRole`: `generateAvatar(prompt.trim(), userId)` и `getAvatarLimit(userId)`.

**Как вернуть:** передавать `userRole` обратно в оба вызова.

---

### 4. `backend/src/modules/templates/templates.service.ts`

**Было:** в `createTemplate` проверка лимита — `MAX_TEMPLATES = isPro ? 100 : 5`.  
**Стало:** удалён блок проверки, оставлен комментарий "Лимит шаблонов временно отключён".

**Как вернуть:** восстановить блок с проверкой `userTemplatesCount >= MAX_TEMPLATES`.

---

**Было:** при применении шаблона проверка `template.isProOnly` и `user?.isPro`.  
**Стало:** удалён блок, оставлен комментарий.

**Как вернуть:** восстановить блок проверки `isProOnly`.

---

### 5. `backend/src/modules/battles/battles.service.ts`

**Было:** `checkFreeBattleLimit(userId)` — проверял `isPro`, затем лимит 1 баттл в неделю для free.  
**Стало:** пустая функция `async function checkFreeBattleLimit() {}`.

**Как вернуть:** восстановить оригинальную функцию с проверкой `isPro` и лимитом 1 в неделю, вернуть `userId` в параметры и в места вызова.

---

### 6. `backend/src/modules/ai-librarian/ai-librarian.route.ts`

**Было:** `preHandler: [authMiddleware, requirePro]`.  
**Стало:** `preHandler: [authMiddleware]`. Удалён импорт `requirePro`.

**Как вернуть:** вернуть импорт `requirePro` и добавить его обратно в `preHandler` на обоих роутах (`/librarian/status` и `/librarian/chat`).

---

### 7. `src/contexts/AuthContext.tsx`

**Было:** `isPro: fullUserData.isPro`.  
**Стало:** `isPro: true` — все пользователи считаются Pro на фронтенде.

**Как вернуть:** заменить `isPro: true` обратно на `isPro: fullUserData.isPro`.

---

### 8. `backend/src/modules/avatars/avatar.service.ts`

**Было:** `DAILY_AVATAR_LIMIT_PRO = 50`.  
**Стало:** `DAILY_AVATAR_LIMIT = 10` — лимит генераций аватаров в день.

**Как вернуть:** переименовать обратно в `DAILY_AVATAR_LIMIT_PRO` и вернуть значение `50`.

---

### 9. `src/components/Avatar/components/AiGenerationTab.tsx`

**Было:** проверка `limitInfo?.isPro` — показывала баннер "только для Pro".  
**Стало:** полностью убрана проверка `isPro` из компонента, удалены пропсы `isPro`.

**Как вернуть:** восстановить `isPro` пропс, проверку на `limitInfo?.isPro`, баннер для free и заблокированную кнопку "Требуется Pro подписка".

---

### 10. `src/ui/Header.tsx`

**Было:** вкладка "Pro" вела на `/pricing`.  
**Стало:** без `onClick`, с бейджем "скоро", курсор `cursor-not-allowed`.

**Как вернуть:** убрать `badge: "скоро"`, вернуть `onClick: () => navigate("/pricing")`.

---

### 11. Адаптивные CSS-правки (responsive)

В рамках аудита адаптивности были изменены 15 файлов:
- `AiLibrarianModal.tsx` — `h-[600px]` → `max-h-[90vh] overflow-y-auto`
- `StatsCards.tsx`, `ProfileActions.tsx`, `CollectionPage.tsx` — сетки `grid-cols-3` → `grid-cols-2 sm:grid-cols-3`
- `ForumPage.tsx`, `BattleDetailPage.tsx` — `overflow-x-auto` для стат-карточек
- `EditorHeader.tsx` — `flex-col` на мобильных
- `EditorMainContent.tsx` — `max-w-full lg:max-w-350`
- `AdminDashboard.tsx` — `grid-cols-1 sm:grid-cols-2`
- Все заголовки `text-3xl`/`text-4xl` → `text-2xl sm:text-3xl/4xl/5xl` (10+ файлов)

**Как вернуть:** `git checkout -- $(git diff --name-only)` — все изменения откатятся разом.

---

### 12. Тесты под новую Pro-логику

Обновлены тесты, которые проверяли старые Pro-лимиты:
- `backend/src/modules/avatars/avatar.service.spec.ts` — лимит 50 → 10, убран `isPro`
- `backend/src/modules/templates/templates.service.spec.ts` — убраны проверки лимита шаблонов

**Как вернуть:** при откате Pro-изменений придётся вручную поправить ожидания в тестах обратно.

---

## Примечание

**FEATURE_UNLOCK.md** — живой документ. При каждом изменении, связанном с Pro-разблокировкой, добавляй сюда запись. При откате можно просто сделать `git checkout -- $(git diff --name-only)`, но тесты придётся чинить руками.

## Быстрый revert одной командой (через git)

```bash
git diff --name-only  # показать изменённые файлы
git checkout -- \
  backend/src/middleware/proLimit.ts \
  backend/src/modules/avatars/avatar.service.ts \
  backend/src/modules/avatars/avatar.route.ts \
  backend/src/modules/templates/templates.service.ts \
  backend/src/modules/battles/battles.service.ts \
  backend/src/modules/ai-librarian/ai-librarian.route.ts \
  src/contexts/AuthContext.tsx
```

Или одной командой (если не было других изменений):

```bash
git checkout -- $(git diff --name-only)
```
