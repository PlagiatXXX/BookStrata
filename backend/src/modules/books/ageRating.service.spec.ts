// backend/src/modules/books/ageRating.service.spec.ts
import { describe, it, expect } from "vitest";
import {
  detectAgeRatingFromMetadata,
  extractDirectAgeMarking,
} from "./ageRating.service.js";

describe("extractDirectAgeMarking", () => {
  it("распознаёт официальные формулировки 436-ФЗ", () => {
    expect(
      extractDirectAgeMarking("Возрастное ограничение: 18+.\nЗахватывающий триллер."),
    ).toEqual({ rating: "18+", reason: "маркировка 18+" });

    expect(
      extractDirectAgeMarking("Возрастной ценз: 16+"),
    ).toEqual({ rating: "16+", reason: "маркировка 16+" });

    expect(
      extractDirectAgeMarking("Знак информационной продукции: 12+"),
    ).toEqual({ rating: "12+", reason: "маркировка 12+" });

    expect(
      extractDirectAgeMarking("Маркировка: 6+"),
    ).toEqual({ rating: "6+", reason: "маркировка 6+" });

    expect(
      extractDirectAgeMarking("Возрастное ограничение 0+"),
    ).toEqual({ rating: "0+", reason: "маркировка 0+" });
  });

  it("распознаёт формулировки 'для читателей / детей старше N лет'", () => {
    expect(
      extractDirectAgeMarking("Книга предназначена для читателей старше 18 лет."),
    ).toEqual({ rating: "18+", reason: "для лиц старше 18 лет" });

    expect(
      extractDirectAgeMarking("Для детей старше 12 лет"),
    ).toEqual({ rating: "12+", reason: "для детей старше 12 лет" });

    expect(
      extractDirectAgeMarking("Для детей от 6 лет"),
    ).toEqual({ rating: "6+", reason: "для детей старше 6 лет" });
  });

  it("распознаёт нецензурную брань как строго 18+ по 436-ФЗ", () => {
    expect(
      extractDirectAgeMarking("Внимание! Содержит нецензурную брань."),
    ).toEqual({ rating: "18+", reason: "нецензурная брань (436-ФЗ)" });

    expect(
      extractDirectAgeMarking("Книга включает ненормативную лексику."),
    ).toEqual({ rating: "18+", reason: "нецензурная брань (436-ФЗ)" });
  });

  it("распознаёт отдельно стоящие маркеры 18+ и 16+", () => {
    expect(extractDirectAgeMarking("Роман о любви.\n18+")).toEqual({
      rating: "18+",
      reason: "маркировка 18+",
    });

    expect(extractDirectAgeMarking("[16+] Захватывающий детектив")).toEqual({
      rating: "16+",
      reason: "маркировка 16+",
    });
  });

  it("не срабатывает на обычные числа или год", () => {
    expect(extractDirectAgeMarking("В 18 веке произошли события...")).toBeNull();
    expect(extractDirectAgeMarking("Ему было 16 лет когда он уехал")).toBeNull();
  });
});

describe("detectAgeRatingFromMetadata", () => {
  it("отдаёт приоритет 18+ при наличии нецензурной брани даже при теге young adult", () => {
    const book = {
      genre: "Современная проза",
      tags: ["young adult", "романтика"],
      description: "История о подростках. Содержит нецензурную брань и откровенные сцены.",
    };
    expect(detectAgeRatingFromMetadata(book)).toEqual({
      rating: "18+",
      reason: "нецензурная брань (436-ФЗ)",
    });
  });

  it("распознаёт 18+ по жанру и ключевым тегам (dark romance, эротика)", () => {
    expect(
      detectAgeRatingFromMetadata({
        genre: "Эротика",
        tags: ["романтика"],
        description: "Горячий роман.",
      }),
    ).toEqual({ rating: "18+", reason: "жанр/тег: эротика" });

    expect(
      detectAgeRatingFromMetadata({
        genre: "Любовный роман",
        tags: ["дарк романс", "мафия"],
        description: "Опасная страсть.",
      }),
    ).toEqual({ rating: "18+", reason: "жанр/тег: дарк романс" });

    expect(
      detectAgeRatingFromMetadata({
        genre: "Хоррор",
        tags: ["сплаттерпанк"],
        description: "Жестокие события.",
      }),
    ).toEqual({ rating: "18+", reason: "жанр/тег: сплаттерпанк" });
  });

  it("распознаёт 16+ для триллеров, детективов и ужасов", () => {
    expect(
      detectAgeRatingFromMetadata({
        genre: "Психологический триллер",
        tags: ["маньяк", "расследование"],
        description: "Мрачное расследование серийных убийств.",
      }),
    ).toEqual({ rating: "16+", reason: "жанр/тег: психологический триллер" });

    expect(
      detectAgeRatingFromMetadata({
        genre: "Ужасы",
        tags: ["призраки"],
        description: "Жуткий заброшенный дом.",
      }),
    ).toEqual({ rating: "16+", reason: "жанр/тег: ужасы" });
  });

  it("распознаёт 16+ для современной зарубежной прозы и НЕ ставит 0+ из-за слова 'сказка' (кейс Сары Джио)", () => {
    const sgioBook = {
      genre: "Современная зарубежная проза",
      tags: ["романтика", "драма"],
      description: "Их встреча в Лондоне была похожа на сказку, но тайны прошлого разрушили идиллию.",
    };
    expect(detectAgeRatingFromMetadata(sgioBook)).toEqual({
      rating: "16+",
      reason: "жанр/тег: современная зарубежная проза",
    });
  });

  it("распознаёт 18+ для книг Стивена Кинга (кейс 'Бегущий человек')", () => {
    const kingBook = {
      title: "Бегущий человек",
      author: "Стивен Кинг",
      genre: "Антиутопия",
      description: "Борьба за жизнь в тоталитарном реалити-шоу на выживание.",
    };
    expect(detectAgeRatingFromMetadata(kingBook)).toEqual({
      rating: "18+",
      reason: "автор 18+: Стивен Кинг",
    });
  });

  it("распознаёт 18+ для молодежных романов со сценами насилия/буллинга (кейс Хлои Уолш)", () => {
    const walshBook = {
      genre: "Young Adult",
      tags: ["спорт", "young adult"],
      description: "Она бежит от жестокости и буллинга. Содержит сцены насилия и тяжелые травмы.",
    };
    expect(detectAgeRatingFromMetadata(walshBook)).toEqual({
      rating: "18+",
      reason: "описание: сцены насилия",
    });
  });

  it("ставит 0+ для настоящей детской литературы по жанру/тегу", () => {
    expect(
      detectAgeRatingFromMetadata({
        genre: "Сказки",
        tags: ["детские книги", "для малышей"],
        description: "Добрые сказки на ночь для самых маленьких.",
      }),
    ).toEqual({ rating: "0+", reason: "детский жанр/тег" });

    expect(
      detectAgeRatingFromMetadata({
        genre: "Детская литература",
        tags: ["книжка-картинка"],
        description: "Иллюстрированная книжка для малышей.",
      }),
    ).toEqual({ rating: "0+", reason: "детский жанр/тег" });
  });

  it("распознаёт 6+ для детских приключений и начальной школы", () => {
    expect(
      detectAgeRatingFromMetadata({
        genre: "Детские приключения",
        tags: ["для начальной школы", "6+"],
        description: "Веселые приключения второклассников.",
      }),
    ).toEqual({ rating: "6+", reason: "маркировка 6+" });
  });

  it("распознаёт 12+ для классического Young Adult без взрослого контента", () => {
    expect(
      detectAgeRatingFromMetadata({
        genre: "Подростковое фэнтези",
        tags: ["магическая школа"],
        description: "Ученики академии магии готовятся к турниру.",
      }),
    ).toEqual({ rating: "12+", reason: "жанр/тег: подростковое фэнтези" });
  });
});
