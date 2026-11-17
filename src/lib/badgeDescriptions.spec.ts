/// <reference types="vitest/globals" />

import { describe, it, expect } from "vitest"
import { getBadgeDescription, BADGE_DESCRIPTIONS } from "./badgeDescriptions"

describe("badgeDescriptions", () => {
  it("возвращает остроумные описания для ключевых ролей и бейджей", () => {
    expect(getBadgeDescription("Админ")).toContain("Верховный архитектор книжных полок")
    expect(getBadgeDescription("Мод")).toContain("Хранитель книжного спокойствия")
    expect(getBadgeDescription("Меценат")).toContain("Благородная душа BookStrata")
    expect(getBadgeDescription("Спонсор")).toContain("Меценат высшей категории")
    expect(getBadgeDescription("Блогер")).toContain("Властелин книжных рекомендаций")
    expect(getBadgeDescription("Писатель")).toContain("Человек по ту сторону страниц")
    expect(getBadgeDescription("Звездочка")).toContain("Сияет на книжном небосклоне")
    expect(getBadgeDescription("Звёздочка")).toContain("Сияет на книжном небосклоне")
    expect(getBadgeDescription("Старожил")).toContain("Живая летопись проекта")
    expect(getBadgeDescription("Сторожила")).toContain("Живая летопись проекта")
    expect(getBadgeDescription("Легенда")).toContain("Вписал своё имя в золотые скрижали")
  })

  it("регистронезависим и устойчив к пробелам", () => {
    expect(getBadgeDescription("  АДМИН  ")).toEqual(BADGE_DESCRIPTIONS["админ"])
    expect(getBadgeDescription("сПоНсОр")).toEqual(BADGE_DESCRIPTIONS["спонсор"])
  })

  it("генерирует дефолтное пояснение для неизвестных кастомных бейджей", () => {
    expect(getBadgeDescription("Коллекционер комиксов")).toBe(
      "Почётный знак отличия читателя «Коллекционер комиксов» на BookStrata ✨",
    )
  })
})
