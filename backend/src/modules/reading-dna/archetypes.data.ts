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
    name: "Орден Смыслов",
    sealColor: "#c0c0c8",
    badgeClass: "text-slate-300 border-slate-400/40 bg-slate-500/10",
  },
  abyss: {
    id: "abyss",
    name: "Орден Бездны",
    sealColor: "#8a2433",
    badgeClass: "text-rose-300 border-rose-400/40 bg-rose-500/10",
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

export interface AxisRange {
  min: number;
  max: number;
}

export type DnaAxisKey =
  | "storyFocus"
  | "emotionalWeight"
  | "pace"
  | "darkness"
  | "scope"
  | "complexity";

export interface ArchetypeDefinition {
  id: string;
  number: number;
  caste: CasteInfo;
  rarity: number;
  names: {
    dark: string;
    craft: string;
  };
  description: string;
  quote: string;
  specialSign: string;
  axisRanges: Record<DnaAxisKey, AxisRange>;
}

function makeRange(ideal: number, tolerance = 12): AxisRange {
  return {
    min: Math.max(0, ideal - tolerance),
    max: Math.min(100, ideal + tolerance),
  };
}

export const ARCHETYPES: ArchetypeDefinition[] = [
  // ─────────────────────────────────────────────────────────────
  // 🏛️ I. Орден Смыслов (Смыслы, Интеллект, Слог)
  // ─────────────────────────────────────────────────────────────
  {
    id: "meaning-architect",
    number: 1,
    caste: CASTES.mind,
    rarity: 7,
    names: {
      dark: "Архитектор смыслов",
      craft: "Искатель сути",
    },
    description:
      "Интеллектуальная проза, философские романы и многослойный модернизм. Книги для глубокой рефлексии.",
    quote: "Книга — это не побег от реальности, а инструмент для её препарирования",
    specialSign: "Иммунитет к простым сюжетам. Обожает скрытые метафоры и ненадежных рассказчиков.",
    axisRanges: {
      storyFocus: makeRange(90),
      emotionalWeight: makeRange(80),
      pace: makeRange(75),
      darkness: makeRange(60),
      scope: makeRange(75),
      complexity: makeRange(90),
    },
  },
  {
    id: "aesthetic-stylist",
    number: 2,
    caste: CASTES.mind,
    rarity: 4,
    names: {
      dark: "Магистр слога",
      craft: "Ловец красивых фраз",
    },
    description:
      "Орнаментальная проза, поэзия в прозе, безупречный стиль и музыкальное звучание языка.",
    quote: "Сюжет вторичен. Имеет значение лишь музыка слов и точность эпитета",
    specialSign: "Читает медленно, смакуя каждую фразу, как редкое коллекционное вино.",
    axisRanges: {
      storyFocus: makeRange(80),
      emotionalWeight: makeRange(80),
      pace: makeRange(85),
      darkness: makeRange(45),
      scope: makeRange(40),
      complexity: makeRange(95),
    },
  },
  {
    id: "relentless-critic",
    number: 3,
    caste: CASTES.mind,
    rarity: 5,
    names: {
      dark: "Инквизитор канона",
      craft: "Бескомпромиссный критик",
    },
    description:
      "Академическое литературоведение, бескомпромиссная классика и редкие малотиражные издания.",
    quote: "Жизнь слишком коротка, чтобы тратить ее на посредственные книги",
    specialSign: "Длинный список безжалостно брошенных книг и культ безупречного текста.",
    axisRanges: {
      storyFocus: makeRange(85),
      emotionalWeight: makeRange(70),
      pace: makeRange(60),
      darkness: makeRange(65),
      scope: makeRange(70),
      complexity: makeRange(90),
    },
  },
  {
    id: "epoch-chronicler",
    number: 4,
    caste: CASTES.mind,
    rarity: 6,
    names: {
      dark: "Хроникер эпох",
      craft: "Архивариус времени",
    },
    description:
      "Исторические эпопеи, хроники, документальная проза и мемуары выдающихся личностей.",
    quote: "Понять прошлое — единственный способ разглядеть контуры будущего",
    specialSign: "Ценит историческую достоверность, быт прошлых веков и причинно-следственные связи.",
    axisRanges: {
      storyFocus: makeRange(75),
      emotionalWeight: makeRange(60),
      pace: makeRange(70),
      darkness: makeRange(55),
      scope: makeRange(85),
      complexity: makeRange(75),
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 🗝️ II. Орден Бездны (Тёмные психологи, Катарсис, Тень)
  // ─────────────────────────────────────────────────────────────
  {
    id: "dark-archivist",
    number: 5,
    caste: CASTES.abyss,
    rarity: 7,
    names: {
      dark: "Хранитель запретных фолиантов",
      craft: "Полуночный затворник",
    },
    description:
      "Темная классика, готика, психологический хоррор, лавкрафтиана и проницательные антиутопии.",
    quote: "В тенях всегда скрыто больше правды, чем при ярком дневном свете",
    specialSign: "Ищет катарсис через тревогу и исследование бездны человеческой природы.",
    axisRanges: {
      storyFocus: makeRange(65),
      emotionalWeight: makeRange(85),
      pace: makeRange(45),
      darkness: makeRange(90),
      scope: makeRange(55),
      complexity: makeRange(75),
    },
  },
  {
    id: "soul-anatomist",
    number: 6,
    caste: CASTES.abyss,
    rarity: 6,
    names: {
      dark: "Анатомист душ",
      craft: "Читатель сердец",
    },
    description:
      "Глубокий психологический реализм, тонкие семейные саги и бескомпромиссные драмы отношений.",
    quote: "Самый сложный лабиринт во Вселенной — это внутренний мир одного человека",
    specialSign: "Внимателен к полутонам диалогов, мотивам предательства, вины и прощения.",
    axisRanges: {
      storyFocus: makeRange(85),
      emotionalWeight: makeRange(90),
      pace: makeRange(65),
      darkness: makeRange(70),
      scope: makeRange(30),
      complexity: makeRange(80),
    },
  },
  {
    id: "dark-irony-alchemist",
    number: 7,
    caste: CASTES.abyss,
    rarity: 6,
    names: {
      dark: "Алхимик темной иронии",
      craft: "Сатирик бездны",
    },
    description:
      "Черный юмор, острая социальная сатира, абсурд и философский антиутопический гротеск.",
    quote: "Если мир сходит с ума — единственный разумный ответ это улыбка Чеширского кота",
    specialSign: "Прячет экзистенциальную тоску за блестящим и язвительным остроумием.",
    axisRanges: {
      storyFocus: makeRange(40),
      emotionalWeight: makeRange(50),
      pace: makeRange(35),
      darkness: makeRange(70),
      scope: makeRange(55),
      complexity: makeRange(70),
    },
  },
  {
    id: "counterculture-rebel",
    number: 8,
    caste: CASTES.abyss,
    rarity: 7,
    names: {
      dark: "Бунтарь контркультуры",
      craft: "Вольнодумец",
    },
    description:
      "Битники, едкая сатира, дерзкий постмодернизм, провокации и разрушение литературных канонов.",
    quote: "Истинная литература должна быть пощечиной общественному вкусу",
    specialSign: "Терпеть не может слащавость, политкорректность и шаблонные морали.",
    axisRanges: {
      storyFocus: makeRange(55),
      emotionalWeight: makeRange(75),
      pace: makeRange(30),
      darkness: makeRange(75),
      scope: makeRange(50),
      complexity: makeRange(85),
    },
  },

  // ─────────────────────────────────────────────────────────────
  // ⚔️ III. Орден Действия (Сюжет, Расследования, Вселенные)
  // ─────────────────────────────────────────────────────────────
  {
    id: "plot-hunter",
    number: 9,
    caste: CASTES.action,
    rarity: 10,
    names: {
      dark: "Охотник за сюжетами",
      craft: "Ловец историй",
    },
    description:
      "Стремительные детективы, триллеры, шпионские драмы и золотой век научной фантастики.",
    quote: "Ещё одну главу — и точно спать (спойлер: до утра)",
    specialSign: "Не переносит «воду» и 20 страниц описания дуба. Важен пульс и напряжение.",
    axisRanges: {
      storyFocus: makeRange(15),
      emotionalWeight: makeRange(45),
      pace: makeRange(15),
      darkness: makeRange(50),
      scope: makeRange(60),
      complexity: makeRange(35),
    },
  },
  {
    id: "world-cartographer",
    number: 10,
    caste: CASTES.action,
    rarity: 9,
    names: {
      dark: "Картограф миров",
      craft: "Путешественник по вселенным",
    },
    description:
      "Эпическое и темное фэнтези, грандиозные космооперы и масштабный sci-fi с детализированным лором.",
    quote: "Мой настоящий дом простирается далеко за пределами этой галактики",
    specialSign: "Первым делом ищет карту на форзаце книги и словарь терминов в конце.",
    axisRanges: {
      storyFocus: makeRange(40),
      emotionalWeight: makeRange(60),
      pace: makeRange(35),
      darkness: makeRange(60),
      scope: makeRange(95),
      complexity: makeRange(70),
    },
  },
  {
    id: "mystery-detective",
    number: 11,
    caste: CASTES.action,
    rarity: 7,
    names: {
      dark: "Шпион книжных лабиринтов",
      craft: "Разгадчик тайн",
    },
    description:
      "Классические герметичные детективы, логические дуэли с автором и хитроумные головоломки.",
    quote: "В идеальном преступлении улика всегда лежит на самом видном месте",
    specialSign: "Пытается вычислить убийцу раньше сыщика и замечает каждую нестыковку сюжета.",
    axisRanges: {
      storyFocus: makeRange(25),
      emotionalWeight: makeRange(50),
      pace: makeRange(40),
      darkness: makeRange(55),
      scope: makeRange(45),
      complexity: makeRange(65),
    },
  },
  {
    id: "scifi-pathfinder",
    number: 12,
    caste: CASTES.action,
    rarity: 5,
    names: {
      dark: "Следопыт звёздных далей",
      craft: "Космический пилигрим",
    },
    description:
      "Твёрдая научная фантастика, футурология, киберпанк и исследование пределов разума.",
    quote: "Границы Вселенной заканчиваются там, где иссякает человеческое воображение",
    specialSign: "Ценит научную достоверность концепций и масштаб футуристической мысли.",
    axisRanges: {
      storyFocus: makeRange(35),
      emotionalWeight: makeRange(40),
      pace: makeRange(45),
      darkness: makeRange(50),
      scope: makeRange(90),
      complexity: makeRange(75),
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 🕯️ IV. Орден Света (Уют, Исцеление, Скрытая магия)
  // ─────────────────────────────────────────────────────────────
  {
    id: "cozy-dreamer",
    number: 13,
    caste: CASTES.light,
    rarity: 8,
    names: {
      dark: "Ламповый мечтатель",
      craft: "Хранитель уюта",
    },
    description:
      "Магический реализм, уютная согревающая проза и жизнеутверждающие трогательные истории.",
    quote: "Книги как чашка горячего чая в дождливый ноябрьский вечер",
    specialSign: "Читает ради душевного исцеления, веры в доброту и человеческое тепло.",
    axisRanges: {
      storyFocus: makeRange(50),
      emotionalWeight: makeRange(30),
      pace: makeRange(60),
      darkness: makeRange(10),
      scope: makeRange(25),
      complexity: makeRange(35),
    },
  },
  {
    id: "secret-romantic",
    number: 14,
    caste: CASTES.light,
    rarity: 7,
    names: {
      dark: "Романтик тайных троп",
      craft: "Искатель чудес",
    },
    description:
      "Городское фэнтези, поэтический реализм и истории о скрытой магии в повседневной суете.",
    quote: "Магия существует повсюду, нужно лишь знать, какую дверь приоткрыть",
    specialSign: "Верит в параллельные миры за шкафом и необычные знаки судьбы.",
    axisRanges: {
      storyFocus: makeRange(45),
      emotionalWeight: makeRange(70),
      pace: makeRange(50),
      darkness: makeRange(40),
      scope: makeRange(60),
      complexity: makeRange(60),
    },
  },
  {
    id: "youth-keeper",
    number: 15,
    caste: CASTES.light,
    rarity: 6,
    names: {
      dark: "Хранитель вечной юности",
      craft: "Читатель под одеялом",
    },
    description:
      "Романы взросления, пронзительная ностальгия, первые открытия и чистые эмоции юности.",
    quote: "Мы никогда не вырастаем из тех историй, что спасли нас в детстве",
    specialSign: "Перечитывает любимые подростковые книги и плачет на последних главах.",
    axisRanges: {
      storyFocus: makeRange(50),
      emotionalWeight: makeRange(75),
      pace: makeRange(45),
      darkness: makeRange(30),
      scope: makeRange(40),
      complexity: makeRange(40),
    },
  },
  {
    id: "book-hedonist",
    number: 16,
    caste: CASTES.light,
    rarity: 7,
    names: {
      dark: "Книжный гедонист",
      craft: "Читатель настроения",
    },
    description:
      "Импульсивное чтение ради чистого удовольствия: сегодня комикс, завтра поэзия, послезавтра детектив.",
    quote: "Чтение — это не школьный урок, а самое изысканное удовольствие на земле",
    specialSign: "Читает 5 книг одновременно, бросает без вины и покупает по красивой обложке.",
    axisRanges: {
      storyFocus: makeRange(40),
      emotionalWeight: makeRange(50),
      pace: makeRange(50),
      darkness: makeRange(35),
      scope: makeRange(50),
      complexity: makeRange(45),
    },
  },
];
