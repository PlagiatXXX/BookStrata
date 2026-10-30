/**
 * Маппинг тегов коллекций на categoryId для перелинковки (/topics/:id).
 * Поддерживает регистронезависимый поиск через Proxy.
 */
const RAW_TAG_TO_CATEGORY: Record<string, string> = {
  // Фэнтези (fantasy)
  "Фэнтези": "fantasy",
  "фэнтези": "fantasy",
  "Фентези": "fantasy",
  "фентези": "fantasy",
  "Эпическое фэнтези": "fantasy",
  "эпическое фэнтези": "fantasy",
  "Городское фэнтези": "fantasy",
  "городское фэнтези": "fantasy",
  "Тёмное фэнтези": "fantasy",
  "тёмное фэнтези": "fantasy",
  "Темное фэнтези": "fantasy",
  "темное фэнтези": "fantasy",
  "Героическое фэнтези": "fantasy",
  "героическое фэнтези": "fantasy",
  "Боевое фэнтези": "fantasy",
  "боевое фэнтези": "fantasy",
  "Магия": "fantasy",
  "магия": "fantasy",
  "Попаданцы": "fantasy",
  "попаданцы": "fantasy",
  "Романтическое фэнтези": "fantasy",
  "романтическое фэнтези": "fantasy",
  "Ромфант": "fantasy",
  "ромфант": "fantasy",
  "Любовное фэнтези": "fantasy",
  "любовное фэнтези": "fantasy",

  // Славянское фэнтези (slavic-fantasy)
  "Славянское фэнтези": "slavic-fantasy",
  "славянское фэнтези": "slavic-fantasy",
  "Славянские мифы": "slavic-fantasy",
  "славянские мифы": "slavic-fantasy",
  "Русское фэнтези": "slavic-fantasy",
  "русское фэнтези": "slavic-fantasy",
  "Славянский фольклор": "slavic-fantasy",

  // Фантастика (sci-fi)
  "Фантастика": "sci-fi",
  "фантастика": "sci-fi",
  "Научная фантастика": "sci-fi",
  "научная фантастика": "sci-fi",
  "Sci-Fi": "sci-fi",
  "sci-fi": "sci-fi",
  "Космос": "sci-fi",
  "космос": "sci-fi",
  "Космическая фантастика": "sci-fi",
  "космическая фантастика": "sci-fi",
  "Хронофантастика": "sci-fi",
  "Боевая фантастика": "sci-fi",

  // Киберпанк (cyberpunk)
  "Киберпанк": "cyberpunk",
  "киберпанк": "cyberpunk",
  "Cyberpunk": "cyberpunk",
  "cyberpunk": "cyberpunk",

  // Антиутопии (dystopia)
  "Антиутопия": "dystopia",
  "антиутопия": "dystopia",
  "Антиутопии": "dystopia",
  "антиутопии": "dystopia",
  "Постапокалипсис": "dystopia",
  "постапокалипсис": "dystopia",
  "Утопия": "dystopia",

  // Детективы и триллеры (thriller)
  "Детектив": "thriller",
  "детектив": "thriller",
  "Детективы": "thriller",
  "детективы": "thriller",
  "Триллер": "thriller",
  "триллер": "thriller",
  "Триллеры": "thriller",
  "триллеры": "thriller",
  "Психологический триллер": "thriller",
  "психологический триллер": "thriller",
  "Криминал": "thriller",
  "криминал": "thriller",
  "Расследования": "thriller",
  "расследования": "thriller",
  "Остросюжетное": "thriller",
  "остросюжетное": "thriller",

  // Ужасы и мистика (horror)
  "Ужасы": "horror",
  "ужасы": "horror",
  "Хоррор": "horror",
  "хоррор": "horror",
  "Хорроры": "horror",
  "хорроры": "horror",
  "Мистика": "horror",
  "мистика": "horror",
  "Мистический триллер": "horror",
  "Страшные книги": "horror",
  "книги ужасов": "horror",
  "Книги ужасов": "horror",
  "Хэллоуин": "horror",
  "хэллоуин": "horror",
  "вампиры": "horror",
  "Вампиры": "horror",
  "ведьмы": "horror",
  "Ведьмы": "horror",

  // Классика (classics)
  "Классика": "classics",
  "классика": "classics",
  "Классическая литература": "classics",
  "классическая литература": "classics",
  "Мировая литература": "classics",
  "мировая литература": "classics",
  "Зарубежная классика": "classics",
  "зарубежная классика": "classics",
  "Шедевры": "classics",
  "шедевры": "classics",
  "Must read": "classics",
  "must read": "classics",
  "Обязательное": "classics",
  "обязательное": "classics",
  "Важное": "classics",
  "важное": "classics",
  "Топ": "classics",
  "топ": "classics",
  "Золотой фонд": "classics",
  "Лучшие книги": "classics",
  "лучшие книги": "classics",
  "Выбор читателей": "classics",
  "выбор читателей": "classics",
  "Популярное": "classics",
  "популярное": "classics",
  "Бестселлеры": "classics",
  "бестселлеры": "classics",
  "Нобелевская премия": "classics",
  "нобелевская премия": "classics",
  "Лауреаты": "classics",
  "лауреаты": "classics",
  "XIX век": "classics",
  "xix век": "classics",

  // Русская классика (russian-classics)
  "Русские книги": "russian-classics",
  "русские книги": "russian-classics",
  "Русская классика": "russian-classics",
  "русская классика": "russian-classics",
  "Отечественная классика": "russian-classics",
  "отечественная классика": "russian-classics",
  "Русская литература": "russian-classics",
  "русская литература": "russian-classics",

  // Исторические романы (historical)
  "Исторические романы": "historical",
  "исторические романы": "historical",
  "Исторический роман": "historical",
  "исторический роман": "historical",
  "Историческая проза": "historical",
  "историческая проза": "historical",
  "История": "historical",
  "история": "historical",

  // Любовные романы (romance)
  "Романы": "romance",
  "романы": "romance",
  "Роман": "romance",
  "роман": "romance",
  "Романтика": "romance",
  "романтика": "romance",
  "Любовные истории": "romance",
  "любовные истории": "romance",
  "Любовный роман": "romance",
  "любовный роман": "romance",
  "Чувства": "romance",
  "чувства": "romance",
  "Дарк романы": "romance",
  "дарк романы": "romance",
  "Тёмный роман": "romance",
  "тёмный роман": "romance",
  "Отношения": "romance",
  "отношения": "romance",

  // Нон-фикшн (non-fiction)
  "Нон-фикшн": "non-fiction",
  "нон-фикшн": "non-fiction",
  "Нонфикшн": "non-fiction",
  "нонфикшн": "non-fiction",
  "Non-fiction": "non-fiction",
  "non-fiction": "non-fiction",
  "Научно-популярная литература": "non-fiction",
  "научно-популярная литература": "non-fiction",
  "научно-популярное": "non-fiction",
  "Научно-популярное": "non-fiction",
  "Научпоп": "non-fiction",
  "научпоп": "non-fiction",
  "Наука": "non-fiction",
  "наука": "non-fiction",
  "Популяризация науки": "non-fiction",
  "популяризация науки": "non-fiction",
  "Саморазвитие": "non-fiction",
  "саморазвитие": "non-fiction",
  "Психология": "non-fiction",
  "психология": "non-fiction",
  "Биографии": "non-fiction",
  "биографии": "non-fiction",
  "Биография": "non-fiction",
  "биография": "non-fiction",
  "Мемуары": "non-fiction",
  "мемуары": "non-fiction",
  "Бизнес": "non-fiction",
  "бизнес": "non-fiction",

  // Подростковое / Young Adult (young-adult)
  "Young Adult": "young-adult",
  "young adult": "young-adult",
  "Янг-эдалт": "young-adult",
  "янг-эдалт": "young-adult",
  "Янг эдалт": "young-adult",
  "янг эдалт": "young-adult",
  "Детская литература": "young-adult",
  "детская литература": "young-adult",
  "Детские книги": "young-adult",
  "детские книги": "young-adult",
  "Подростковое": "young-adult",
  "подростковое": "young-adult",
  "Подростковая литература": "young-adult",
  "подростковая литература": "young-adult",
  "Книги для подростков": "young-adult",

  // Сказки и мифы (myths)
  "Сказки": "myths",
  "сказки": "myths",
  "Сказка": "myths",
  "сказка": "myths",
  "Сказки и мифы": "myths",
  "сказки и мифы": "myths",
  "Мифы": "myths",
  "мифы": "myths",
  "Фольклор": "myths",
  "фольклор": "myths",
  "Легенды": "myths",
  "легенды": "myths",

  // Художественная / Современная проза (fiction)
  "Современная проза": "fiction",
  "современная проза": "fiction",
  "Современное": "fiction",
  "современное": "fiction",
  "Современная литература": "fiction",
  "современная литература": "fiction",
  "Художественная литература": "fiction",
  "художественная литература": "fiction",
  "Проза": "fiction",
  "проза": "fiction",

  // Зарубежная проза (foreign-prose)
  "Зарубежная проза": "foreign-prose",
  "зарубежная проза": "foreign-prose",
  "Зарубежная литература": "foreign-prose",
  "зарубежная литература": "foreign-prose",
  "Иностранная литература": "foreign-prose",
  "иностранная литература": "foreign-prose",

  // Приключения (adventure)
  "Приключения": "adventure",
  "приключения": "adventure",
  "Приключенческий роман": "adventure",
  "приключенческий роман": "adventure",
  "Приключенческая литература": "adventure",

  // Японская литература (japanese)
  "Японская литература": "japanese",
  "японская литература": "japanese",
  "Япония": "japanese",
  "япония": "japanese",
  "Манга": "japanese",
  "манга": "japanese",

  // Военная проза (military)
  "Военная проза": "military",
  "военная проза": "military",
  "Военные книги": "military",
  "военные книги": "military",
  "О войне": "military",
  "о войне": "military",
};

/**
 * Нормализованный регистронезависимый словарь тегов.
 * При обращении TAG_TO_CATEGORY[tag] ищет точное совпадение,
 * а затем совпадение в нижнем регистре без лишних пробелов.
 */
export const TAG_TO_CATEGORY: Record<string, string> = new Proxy(RAW_TAG_TO_CATEGORY, {
  get(target, prop: string | symbol) {
    if (typeof prop !== "string") {
      return Reflect.get(target, prop);
    }
    if (prop in target) {
      return target[prop];
    }
    const trimmed = prop.trim();
    if (trimmed in target) {
      return target[trimmed];
    }
    const lower = trimmed.toLowerCase();
    if (lower in target) {
      return target[lower];
    }
    return undefined;
  },
});
