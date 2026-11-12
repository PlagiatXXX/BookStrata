import type { DnaAxes } from "./readingDna.schema.js";

export type CasteId = "mind" | "abyss" | "action" | "light";

export interface CasteInfo {
  id: CasteId;
  name: string;
  sealColor: string;
  badgeClass: string;
}

export const CASTES: Record<CasteId, CasteInfo> = {
  mind: {
    id: "mind",
    name: "Орден Разума",
    sealColor: "#c0c0c8",
    badgeClass: "text-slate-300 border-slate-400/40 bg-slate-500/10",
  },
  abyss: {
    id: "abyss",
    name: "Орден Бездны",
    sealColor: "#8b5cf6",
    badgeClass: "text-purple-300 border-purple-400/40 bg-purple-500/10",
  },
  action: {
    id: "action",
    name: "Орден Действия",
    sealColor: "#d97706",
    badgeClass: "text-amber-300 border-amber-400/40 bg-amber-500/10",
  },
  light: {
    id: "light",
    name: "Орден Света",
    sealColor: "#eab308",
    badgeClass: "text-yellow-300 border-yellow-400/40 bg-yellow-500/10",
  },
};

export interface ArchetypeDefinition {
  id: string;
  caste: CasteInfo;
  names: {
    dark: string;
    craft: string;
  };
  description: string;
  quote: string;
  specialSign: string;
  idealAxes: DnaAxes;
}

export const ARCHETYPES: ArchetypeDefinition[] = [
  // ─────────────────────────────────────────────────────────────
  // 🏛️ I. Орден Разума (Смыслы, Интеллект, Слог)
  // ─────────────────────────────────────────────────────────────
  {
    id: "meaning-architect",
    caste: CASTES.mind,
    names: {
      dark: "Архитектор смыслов",
      craft: "Искатель сути",
    },
    description:
      "Интеллектуальная проза, философские романы и многослойный модернизм. Книги для глубокой рефлексии.",
    quote: "«Книга — это не побег от реальности, а инструмент для её препарирования»",
    specialSign: "Иммунитет к простым сюжетам. Обожает скрытые метафоры и ненадежных рассказчиков.",
    idealAxes: {
      storyFocus: 90,
      emotionalWeight: 80,
      pace: 75,
      darkness: 60,
      scope: 75,
      complexity: 90,
    },
  },
  {
    id: "aesthetic-stylist",
    caste: CASTES.mind,
    names: {
      dark: "Магистр слога",
      craft: "Ловец красивых фраз",
    },
    description:
      "Орнаментальная проза, поэзия в прозе, безупречный стиль и музыкальное звучание языка.",
    quote: "«Сюжет вторичен. Имеет значение лишь музыка слов и точность эпитета»",
    specialSign: "Читает медленно, смакуя каждую фразу, как редкое коллекционное вино.",
    idealAxes: {
      storyFocus: 80,
      emotionalWeight: 80,
      pace: 85,
      darkness: 45,
      scope: 40,
      complexity: 95,
    },
  },
  {
    id: "relentless-critic",
    caste: CASTES.mind,
    names: {
      dark: "Инквизитор канона",
      craft: "Бескомпромиссный критик",
    },
    description:
      "Академическое литературоведение, бескомпромиссная классика и редкие малотиражные издания.",
    quote: "«Жизнь слишком коротка, чтобы тратить ее на посредственные книги»",
    specialSign: "Длинный список безжалостно брошенных книг и культ безупречного текста.",
    idealAxes: {
      storyFocus: 85,
      emotionalWeight: 70,
      pace: 60,
      darkness: 65,
      scope: 70,
      complexity: 90,
    },
  },
  {
    id: "epoch-chronicler",
    caste: CASTES.mind,
    names: {
      dark: "Хроникер эпох",
      craft: "Архивариус времени",
    },
    description:
      "Исторические эпопеи, хроники, документальная проза и мемуары выдающихся личностей.",
    quote: "«Понять прошлое — единственный способ разглядеть контуры будущего»",
    specialSign: "Ценит историческую достоверность, быт прошлых веков и причинно-следственные связи.",
    idealAxes: {
      storyFocus: 75,
      emotionalWeight: 60,
      pace: 70,
      darkness: 55,
      scope: 85,
      complexity: 75,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 🗝️ II. Орден Бездны (Тёмные психологи, Катарсис, Тень)
  // ─────────────────────────────────────────────────────────────
  {
    id: "dark-archivist",
    caste: CASTES.abyss,
    names: {
      dark: "Хранитель запретных фолиантов",
      craft: "Полуночный затворник",
    },
    description:
      "Темная классика, готика, психологический хоррор, лавкрафтиана и проницательные антиутопии.",
    quote: "«В тенях всегда скрыто больше правды, чем при ярком дневном свете»",
    specialSign: "Ищет катарсис через тревогу и исследование бездны человеческой природы.",
    idealAxes: {
      storyFocus: 65,
      emotionalWeight: 85,
      pace: 45,
      darkness: 90,
      scope: 55,
      complexity: 75,
    },
  },
  {
    id: "soul-anatomist",
    caste: CASTES.abyss,
    names: {
      dark: "Анатомист душ",
      craft: "Читатель сердец",
    },
    description:
      "Глубокий психологический реализм, тонкие семейные саги и бескомпромиссные драмы отношений.",
    quote: "«Самый сложный лабиринт во Вселенной — это внутренний мир одного человека»",
    specialSign: "Внимателен к полутонам диалогов, мотивам предательства, вины и прощения.",
    idealAxes: {
      storyFocus: 85,
      emotionalWeight: 90,
      pace: 65,
      darkness: 70,
      scope: 30,
      complexity: 80,
    },
  },
  {
    id: "dark-irony-alchemist",
    caste: CASTES.abyss,
    names: {
      dark: "Алхимик темной иронии",
      craft: "Сатирик бездны",
    },
    description:
      "Черный юмор, острая социальная сатира, абсурд и философский антиутопический гротеск.",
    quote: "«Если мир сходит с ума — единственный разумный ответ это улыбка Чеширского кота»",
    specialSign: "Прячет экзистенциальную тоску за блестящим и язвительным остроумием.",
    idealAxes: {
      storyFocus: 40,
      emotionalWeight: 50,
      pace: 35,
      darkness: 70,
      scope: 55,
      complexity: 70,
    },
  },
  {
    id: "counterculture-rebel",
    caste: CASTES.abyss,
    names: {
      dark: "Бунтарь контркультуры",
      craft: "Вольнодумец",
    },
    description:
      "Битники, едкая сатира, дерзкий постмодернизм, провокации и разрушение литературных канонов.",
    quote: "«Истинная литература должна быть пощечиной общественному вкусу»",
    specialSign: "Терпеть не может слащавость, политкорректность и шаблонные морали.",
    idealAxes: {
      storyFocus: 55,
      emotionalWeight: 75,
      pace: 30,
      darkness: 75,
      scope: 50,
      complexity: 85,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // ⚔️ III. Орден Действия (Сюжет, Расследования, Вселенные)
  // ─────────────────────────────────────────────────────────────
  {
    id: "plot-hunter",
    caste: CASTES.action,
    names: {
      dark: "Охотник за сюжетами",
      craft: "Ловец историй",
    },
    description:
      "Стремительные детективы, триллеры, шпионские драмы и золотой век научной фантастики.",
    quote: "«Ещё одну главу — и точно спать (спойлер: до утра)»",
    specialSign: "Не переносит «воду» и 20 страниц описания дуба. Важен пульс и напряжение.",
    idealAxes: {
      storyFocus: 15,
      emotionalWeight: 45,
      pace: 15,
      darkness: 50,
      scope: 60,
      complexity: 35,
    },
  },
  {
    id: "world-cartographer",
    caste: CASTES.action,
    names: {
      dark: "Картограф миров",
      craft: "Путешественник по вселенным",
    },
    description:
      "Эпическое и темное фэнтези, грандиозные космооперы и масштабный sci-fi с детализированным лором.",
    quote: "«Мой настоящий дом простирается далеко за пределами этой галактики»",
    specialSign: "Первым делом ищет карту на форзаце книги и словарь терминов в конце.",
    idealAxes: {
      storyFocus: 40,
      emotionalWeight: 60,
      pace: 35,
      darkness: 60,
      scope: 95,
      complexity: 70,
    },
  },
  {
    id: "mystery-detective",
    caste: CASTES.action,
    names: {
      dark: "Шпион книжных лабиринтов",
      craft: "Разгадчик тайн",
    },
    description:
      "Классические герметичные детективы, логические дуэли с автором и хитроумные головоломки.",
    quote: "«В идеальном преступлении улика всегда лежит на самом видном месте»",
    specialSign: "Пытается вычислить убийцу раньше сыщика и замечает каждую нестыковку сюжета.",
    idealAxes: {
      storyFocus: 25,
      emotionalWeight: 50,
      pace: 40,
      darkness: 55,
      scope: 45,
      complexity: 65,
    },
  },
  {
    id: "scifi-pathfinder",
    caste: CASTES.action,
    names: {
      dark: "Следопыт звёздных далей",
      craft: "Космический пилигрим",
    },
    description:
      "Твёрдая научная фантастика, футурология, киберпанк и исследование пределов разума.",
    quote: "«Границы Вселенной заканчиваются там, где иссякает человеческое воображение»",
    specialSign: "Ценит научную достоверность концепций и масштаб футуристической мысли.",
    idealAxes: {
      storyFocus: 35,
      emotionalWeight: 40,
      pace: 45,
      darkness: 50,
      scope: 90,
      complexity: 75,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 🕯️ IV. Орден Света (Уют, Исцеление, Скрытая магия)
  // ─────────────────────────────────────────────────────────────
  {
    id: "cozy-dreamer",
    caste: CASTES.light,
    names: {
      dark: "Ламповый мечтатель",
      craft: "Хранитель уюта",
    },
    description:
      "Магический реализм, уютная согревающая проза и жизнеутверждающие трогательные истории.",
    quote: "«Книги как чашка горячего чая в дождливый ноябрьский вечер»",
    specialSign: "Читает ради душевного исцеления, веры в доброту и человеческое тепло.",
    idealAxes: {
      storyFocus: 50,
      emotionalWeight: 30,
      pace: 60,
      darkness: 10,
      scope: 25,
      complexity: 35,
    },
  },
  {
    id: "secret-romantic",
    caste: CASTES.light,
    names: {
      dark: "Романтик тайных троп",
      craft: "Искатель чудес",
    },
    description:
      "Городское фэнтези, поэтический реализм и истории о скрытой магии в повседневной суете.",
    quote: "«Магия существует повсюду, нужно лишь знать, какую дверь приоткрыть»",
    specialSign: "Верит в параллельные миры за шкафом и необычные знаки судьбы.",
    idealAxes: {
      storyFocus: 45,
      emotionalWeight: 70,
      pace: 50,
      darkness: 40,
      scope: 60,
      complexity: 60,
    },
  },
  {
    id: "youth-keeper",
    caste: CASTES.light,
    names: {
      dark: "Хранитель вечной юности",
      craft: "Читатель под одеялом",
    },
    description:
      "Романы взросления, пронзительная ностальгия, первые открытия и чистые эмоции юности.",
    quote: "«Мы никогда не вырастаем из тех историй, что спасли нас в детстве»",
    specialSign: "Перечитывает любимые подростковые книги и плачет на последних главах.",
    idealAxes: {
      storyFocus: 50,
      emotionalWeight: 75,
      pace: 45,
      darkness: 30,
      scope: 40,
      complexity: 40,
    },
  },
  {
    id: "book-hedonist",
    caste: CASTES.light,
    names: {
      dark: "Книжный гедонист",
      craft: "Читатель настроения",
    },
    description:
      "Импульсивное чтение ради чистого удовольствия: сегодня комикс, завтра поэзия, послезавтра детектив.",
    quote: "«Чтение — это не школьный урок, а самое изысканное удовольствие на земле»",
    specialSign: "Читает 5 книг одновременно, бросает без вины и покупает по красивой обложке.",
    idealAxes: {
      storyFocus: 40,
      emotionalWeight: 50,
      pace: 50,
      darkness: 35,
      scope: 50,
      complexity: 45,
    },
  },
];
