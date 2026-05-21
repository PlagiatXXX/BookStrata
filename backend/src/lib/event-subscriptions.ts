import { eventBus } from "./event-emitter.js";

// Подписка achievement-модуля на события системы
// Все подписки регистрируются при импорте этого файла

export function registerAchievementSubscriptions() {
  // Динамический импорт, чтобы избежать циклических зависимостей
  import("../modules/achievements/achievements.service.js").then(
    ({ processAction }) => {
      eventBus.on("tier-list:created", ({ userId }) =>
        processAction(userId, "create_tier_list"),
      );
      eventBus.on("tier-list:book-added", ({ userId }) =>
        processAction(userId, "add_book"),
      );
      eventBus.on("tier-list:forked", ({ userId }) =>
        processAction(userId, "fork"),
      );
      eventBus.on("tier-list:liked", ({ tierListUserId }) =>
        processAction(tierListUserId, "get_like"),
      );
      eventBus.on("review:written", ({ userId }) =>
        processAction(userId, "write_review"),
      );
      eventBus.on("battle:participated", ({ userId }) =>
        processAction(userId, "participate_battle"),
      );
      eventBus.on("battle:won", ({ userId }) =>
        processAction(userId, "win_battle"),
      );
    },
  );
}
