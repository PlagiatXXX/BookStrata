// src/data/mockData.ts
// Mock-данные для шаблонов, коллекций и новостей
import {
  BookOpen,
  Book,
  History,
  Landmark,
  Rocket,
  SearchCheck,
  TrendingUp,
} from "lucide-react";
import type { CreateTemplateData } from "@/types/templates";

export type TemplateItem = {
  id: number;
  title: string;
  category: string;
  categoryId: string;
  uses: string;
  author: string;
  image: string;
  size: "large" | "standard" | "tall" | "wide";
  type?: "starter" | "curated" | "community";
  badge?: { text: string; color: string };
  borderColor: string;
  templateData: CreateTemplateData;
};

export type NewsItem = {
  id: number;
  title: string;
  excerpt: string;
  tag: string;
  readTime: string;
};

export type CollectionItem = {
  id: number;
  title: string;
  content: string; // HTML-контент
  excerpt: string; // Краткое описание
  coverImageUrl: string; // Обложка коллекции
  bookCovers: string[]; // Массив обложек книг (3-4 шт)
  tags: string[];
  isPublished: boolean;
  order: number; // Порядок сортировки
  createdAt: string;
  updatedAt: string;
};

export const CATEGORIES = [
  { id: "actual", label: "Актуально", icon: TrendingUp },
  { id: "fiction", label: "Художественная", icon: Book },
  { id: "non-fiction", label: "Нон-фикшн", icon: History },
  { id: "fantasy", label: "Фэнтези", icon: BookOpen },
  { id: "classics", label: "Классика", icon: Landmark },
  { id: "sci-fi", label: "Sci-Fi", icon: Rocket },
  { id: "mystery", label: "Детективы", icon: SearchCheck },
];

export const TEMPLATES: TemplateItem[] = [
  {
    id: 1,
    title: "БЕСТСЕЛЛЕРЫ ВСЕХ ВРЕМЁН",
    category: "Бестселлеры",
    categoryId: "actual",
    uses: "85k",
    author: "BookWorm99",
    image: "/images/templates/bestseller.webp",
    size: "large",
    type: "starter",
    badge: { text: "Избранное", color: "accent-blue" },
    borderColor: "accent-blue",
    templateData: {
      title: "Бестселлеры всех времён",
      description: "Классический шаблон для рейтинга лучших книг.",
      type: "starter",
      isPublic: false,
      tiers: [
        { id: "tier_s", name: "S", color: "#ef4444", order: 1 },
        { id: "tier_a", name: "A", color: "#f97316", order: 2 },
        { id: "tier_b", name: "B", color: "#eab308", order: 3 },
        { id: "tier_c", name: "C", color: "#84cc16", order: 4 },
        { id: "tier_d", name: "D", color: "#10b981", order: 5 },
      ],
      defaultBooks: [
        {
          title: "Властелин Колец",
          author: "Дж. Р. Р. Толкин",
          coverImageUrl: "/images/books/lotr.webp",
          description:
            "Эпическое фэнтези о хоббите Фродо, несущем Кольцо Всевластия в Роковую гору.",
          defaultTierId: "tier_s",
          googleBooksId: "1234567890",
        },
        {
          title: "1984",
          author: "Джордж Оруэлл",
          coverImageUrl: "/images/books/1984.webp",
          description:
            "Антиутопия о тоталитарном обществе под контролем Большого Брата.",
          defaultTierId: "tier_s",
          googleBooksId: "1234567891",
        },
        {
          title: "Гарри Поттер и философский камень",
          author: "Дж. К. Роулинг",
          coverImageUrl: "/images/books/harry-potter.webp",
          description:
            "Первая книга о мальчике-волшебнике и его приключениях в Хогвартсе.",
          defaultTierId: "tier_a",
          googleBooksId: "1234567892",
        },
        {
          title: "Убить пересмешника",
          author: "Харпер Ли",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Роман о расовой несправедливости в американском Юге глазами ребёнка.",
          defaultTierId: "tier_a",
          googleBooksId: "1234567893",
        },
        {
          title: "Над пропастью во ржи",
          author: "Дж. Д. Сэлинджер",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "История подростка Холдена Колфилда, бунтующего против фальши взрослого мира.",
          defaultTierId: "tier_b",
          googleBooksId: "1234567894",
        },
        {
          title: "Великий Гэтсби",
          author: "Ф. Скотт Фицджеральд",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Трагическая история любви и американской мечты в эпоху джаза.",
          defaultTierId: "tier_b",
          googleBooksId: "1234567895",
        },
        {
          title: "Повелитель мух",
          author: "Уильям Голдинг",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Группа детей оказывается на необитаемом острове и создаёт своё общество.",
          defaultTierId: "tier_c",
          googleBooksId: "1234567896",
        },
        {
          title: "Преступление и наказание",
          author: "Фёдор Достоевский",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Психологический роман о студенте Раскольникове и его теории о сверхчеловеке.",
          defaultTierId: "tier_c",
          googleBooksId: "1234567897",
        },
      ],
    },
  },
  {
    id: 2,
    title: "ОБЯЗАТЕЛЬНЫЕ КНИГИ 2026",
    category: "Обязательное",
    categoryId: "actual",
    uses: "15k",
    author: "ReadFan",
    image: "/images/templates/2026.webp",
    size: "standard",
    type: "starter",
    borderColor: "accent-green",
    templateData: {
      title: "Обязательные книги 2026",
      description: "Подборка для чтения в этом году.",
      type: "starter",
      isPublic: false,
      tiers: [
        { id: "tier_gold", name: "Must", color: "#f59e0b", order: 1 },
        { id: "tier_silver", name: "Very Good", color: "#22c55e", order: 2 },
        { id: "tier_bronze", name: "Maybe", color: "#3b82f6", order: 3 },
      ],
      defaultBooks: [
        {
          title: "Атомные привычки",
          author: "Джеймс Клир",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Практическое руководство по формированию полезных привычек.",
          defaultTierId: "tier_gold",
        },
        {
          title: "Sapiens. Краткая история человечества",
          author: "Юваль Ной Харари",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "От каменного века до наших дней: как Homo sapiens стал хозяином планеты.",
          defaultTierId: "tier_gold",
        },
        {
          title: "Думай медленно... решай быстро",
          author: "Даниэль Канеман",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Нобелевский лауреат о двух системах мышления.",
          defaultTierId: "tier_silver",
        },
        {
          title: "Краткая история времени",
          author: "Стивен Хокинг",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "От Большого взрыва до чёрных дыр: просто о сложном.",
          defaultTierId: "tier_silver",
        },
        {
          title: "Богатый папа, бедный папа",
          author: "Роберт Кийосаки",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Финансовая грамотность и мышление богатого человека.",
          defaultTierId: "tier_bronze",
        },
        {
          title: "7 навыков высокоэффективных людей",
          author: "Стивен Кови",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Принципы личной эффективности от классика self-help.",
          defaultTierId: "tier_bronze",
        },
      ],
    },
  },
  {
    id: 6,
    title: "ПОПУЛЯРНОЕ НА НЕДЕЛЕ",
    category: "Тренд",
    categoryId: "actual",
    uses: "42k",
    author: "TrendWatcher",
    image: "/images/templates/Popular.webp",
    size: "standard",
    type: "starter",
    badge: { text: "Hot", color: "accent-orange" },
    borderColor: "accent-orange",
    templateData: {
      title: "Популярное на неделе",
      description: "Самое обсуждаемое за последние 7 дней.",
      type: "starter",
      isPublic: false,
      tiers: [
        { id: "tier_hot", name: "Hot", color: "#ef4444", order: 1 },
        { id: "tier_trending", name: "Trending", color: "#f97316", order: 2 },
        { id: "tier_rising", name: "Rising", color: "#eab308", order: 3 },
      ],
      defaultBooks: [
        {
          title: "Шантарам",
          author: "Грегори Дэвид Робертс",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Приключения беглого преступника в Бомбее.",
          defaultTierId: "tier_hot",
        },
        {
          title: "Тень ветра",
          author: "Карлос Руис Сафон",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Мистический триллер в послевоенной Барселоне.",
          defaultTierId: "tier_hot",
        },
        {
          title: "Ночной цирк",
          author: "Эрин Моргенштерн",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Волшебная история о соперничестве иллюзионистов.",
          defaultTierId: "tier_trending",
        },
        {
          title: "Щегол",
          author: "Донна Тартт",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Роман о взрослении и искусстве.",
          defaultTierId: "tier_trending",
        },
        {
          title: "Бегущий за ветром",
          author: "Халед Хоссейни",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Трогательная история дружбы в Афганистане.",
          defaultTierId: "tier_rising",
        },
      ],
    },
  },
  {
    id: 19,
    title: "КЛАССИЧЕСКАЯ ЛИТЕРАТУРА",
    category: "Классика",
    categoryId: "actual",
    uses: "28k",
    author: "ClassicReader",
    image: "/images/templates/Classics.webp",
    size: "tall",
    type: "curated",
    badge: { text: "Топ", color: "primary" },
    borderColor: "primary",
    templateData: {
      title: "Классическая литература",
      description: "Личное ранжирование классиков.",
      type: "curated",
      isPublic: false,
      tiers: [
        { id: "tier_master", name: "Шедевр", color: "#ef4444", order: 1 },
        { id: "tier_strong", name: "Сильно", color: "#f97316", order: 2 },
        { id: "tier_ok", name: "Неплохо", color: "#84cc16", order: 3 },
        { id: "tier_later", name: "Позже", color: "#3b82f6", order: 4 },
      ],
      defaultBooks: [
        {
          title: "Война и мир",
          author: "Лев Толстой",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Эпическое полотно о России в эпоху наполеоновских войн.",
          defaultTierId: "tier_master",
        },
        {
          title: "Анна Каренина",
          author: "Лев Толстой",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "История любви на фоне социальных перемен XIX века.",
          defaultTierId: "tier_master",
        },
        {
          title: "Преступление и наказание",
          author: "Фёдор Достоевский",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Психологический роман о студенте Раскольникове.",
          defaultTierId: "tier_strong",
        },
        {
          title: "Братья Карамазовы",
          author: "Фёдор Достоевский",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Философский роман о вере, семье и морали.",
          defaultTierId: "tier_strong",
        },
        {
          title: "Мастер и Маргарита",
          author: "Михаил Булгаков",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Мистический роман о дьяволе в Москве 1930-х годов.",
          defaultTierId: "tier_master",
        },
        {
          title: "Имя розы",
          author: "Умберто Эко",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Философский детектив в средневековом монастыре.",
          defaultTierId: "tier_ok",
        },
      ],
    },
  },
  {
    id: 3,
    title: "ЭПИЧЕСКИЕ ФЭНТЕЗИ СЕРИИ",
    category: "Фэнтези",
    categoryId: "fantasy",
    uses: "32k",
    author: "FantasyLover",
    image: "/images/templates/fantasy.webp",
    size: "large",
    type: "starter",
    badge: { text: "Топ", color: "accent-orange" },
    borderColor: "accent-orange",
    templateData: {
      title: "Эпические фэнтези серии",
      description: "Ранжируйте саги, циклы и вселенные.",
      type: "starter",
      isPublic: false,
      tiers: [
        { id: "tier_legend", name: "Legend", color: "#8b5cf6", order: 1 },
        { id: "tier_epic", name: "Epic", color: "#ec4899", order: 2 },
        { id: "tier_good", name: "Good", color: "#22c55e", order: 3 },
        { id: "tier_skip", name: "Skip", color: "#64748b", order: 4 },
      ],
      defaultBooks: [
        {
          title: "Властелин Колец",
          author: "Дж. Р. Р. Толкин",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Эпическое фэнтези о хоббите Фродо и Кольце Всевластия.",
          defaultTierId: "tier_legend",
        },
        {
          title: "Ведьмак. Последнее желание",
          author: "Анджей Сапковский",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Истории о ведьмаке Геральте из Ривии.",
          defaultTierId: "tier_legend",
        },
        {
          title: "Имя Ветра",
          author: "Патрик Ротфусс",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Легендарная хроника Квоута, рассказанная им самим.",
          defaultTierId: "tier_epic",
        },
        {
          title: "Путь Королей",
          author: "Брэндон Сандерсон",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Эпическое фэнтези о войне, чести и магии на Рошаре.",
          defaultTierId: "tier_epic",
        },
        {
          title: "Гарри Поттер и философский камень",
          author: "Дж. К. Роулинг",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Первая книга о мальчике-волшебнике.",
          defaultTierId: "tier_good",
        },
        {
          title: "Хроники Нарнии. Лев, колдунья и платяной шкаф",
          author: "К. С. Льюис",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Дети попадают в волшебную страну Нарнию через платяной шкаф.",
          defaultTierId: "tier_good",
        },
        {
          title: "Колесо Времени. Око мира",
          author: "Роберт Джордан",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Масштабная фэнтези-сага о Перерождённом Драконе.",
          defaultTierId: "tier_skip",
        },
      ],
    },
  },
  {
    id: 7,
    title: "YOUNG ADULT ФЭНТЕЗИ",
    category: "Фэнтези",
    categoryId: "fantasy",
    uses: "24k",
    author: "YAFan",
    image: "/images/templates/fantasy2.webp",
    size: "standard",
    type: "starter",
    borderColor: "accent-purple",
    templateData: {
      title: "YA Фэнтези",
      description: "Романтическое и приключенческое фэнтези для молодёжи.",
      type: "starter",
      isPublic: false,
      tiers: [
        { id: "tier_s", name: "S-Tier", color: "#8b5cf6", order: 1 },
        { id: "tier_a", name: "A-Tier", color: "#a855f7", order: 2 },
        { id: "tier_b", name: "B-Tier", color: "#c084fc", order: 3 },
        { id: "tier_c", name: "C-Tier", color: "#d8b4fe", order: 4 },
      ],
      defaultBooks: [
        {
          title: "Шестёрка воронов",
          author: "Ли Бардуго",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Команда преступников пытается совершить невозможное ограбление в магическом мире.",
          defaultTierId: "tier_s",
        },
        {
          title: "Двор шипов и роз",
          author: "Сара Дж. Маас",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Девушка попадает в мир фей и обнаруживает скрытую силу.",
          defaultTierId: "tier_s",
        },
        {
          title: "Голодные игры",
          author: "Сьюзен Коллинз",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Девушка добровольно участвует в смертельных играх вместо сестры.",
          defaultTierId: "tier_a",
        },
        {
          title: "Дивергент",
          author: "Вероника Рот",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "В мире фракций девушка обнаруживает, что не вписывается ни в одну из них.",
          defaultTierId: "tier_a",
        },
        {
          title: "Лабиринт",
          author: "Джеймс Дашнер",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Подростки заперты в гигантском лабиринте и пытаются найти выход.",
          defaultTierId: "tier_b",
        },
        {
          title: "Бегущий в лабиринте",
          author: "Джеймс Дашнер",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Группа подростков ищет способ выбраться из смертельного лабиринта.",
          defaultTierId: "tier_b",
        },
        {
          title: "Тёмные начала",
          author: "Филип Пулман",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Девочка путешествует по параллельным мирам в поисках друга.",
          defaultTierId: "tier_c",
        },
      ],
    },
  },
  {
    id: 8,
    title: "ЛИТРПГ И ПРОГРЕССИВ",
    category: "Фэнтези",
    categoryId: "fantasy",
    uses: "18k",
    author: "GamerReader",
    image: "/images/templates/Rpg.webp",
    size: "standard",
    type: "starter",
    borderColor: "accent-blue",
    templateData: {
      title: "ЛитРПГ и Прогрессив",
      description: "Книги с системами, уровнями и игровыми механиками.",
      type: "starter",
      isPublic: false,
      tiers: [
        { id: "tier_god", name: "God Tier", color: "#ef4444", order: 1 },
        { id: "tier_op", name: "OP", color: "#f97316", order: 2 },
        { id: "tier_strong", name: "Strong", color: "#22c55e", order: 3 },
        { id: "tier_trash", name: "Skip", color: "#64748b", order: 4 },
      ],
      defaultBooks: [
        {
          title: "Легендарный лунный скульптор",
          author: "Нам Хи Сон",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Игрок становится легендарным скульптором в виртуальной реальности.",
          defaultTierId: "tier_god",
        },
        {
          title: "Овергир",
          author: "Андрей Круз",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Герой попадает в игровой мир и начинает свой путь с нуля.",
          defaultTierId: "tier_god",
        },
        {
          title: "Играть, чтобы жить",
          author: "Рус",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Смертельно болен и вынужден играть в виртуальную игру для выживания.",
          defaultTierId: "tier_op",
        },
        {
          title: "Путь Шамана",
          author: "Василь Маханенко",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Игрок выбирает непопулярный класс шамана и становится легендой.",
          defaultTierId: "tier_op",
        },
        {
          title: "Конструктор миров",
          author: "Алексей Пехов",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Герой создаёт собственные миры с уникальными правилами.",
          defaultTierId: "tier_strong",
        },
        {
          title: "Сфера Величия",
          author: "Дмитрий Рус",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Виртуальная игра становится реальностью для миллионов игроков.",
          defaultTierId: "tier_strong",
        },
        {
          title: "Фентерра",
          author: "Андрей Круз",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Полное погружение в фэнтезийный мир с игровыми механиками.",
          defaultTierId: "tier_trash",
        },
      ],
    },
  },
  {
    id: 9,
    title: "РОМАНТИЧЕСКОЕ ФЭНТЕЗИ",
    category: "Фэнтези",
    categoryId: "fantasy",
    uses: "21k",
    author: "RomanceReader",
    image: "/images/templates/Romantic.webp",
    size: "tall",
    type: "starter",
    badge: { text: "Романтика", color: "accent-pink" },
    borderColor: "#ec4899",
    templateData: {
      title: "Романтическое фэнтези",
      description: "Любовь, магия и приключения.",
      type: "starter",
      isPublic: false,
      tiers: [
        { id: "tier_otp", name: "OTP", color: "#ec4899", order: 1 },
        { id: "tier_fave", name: "Favorite", color: "#f472b6", order: 2 },
        { id: "tier_good", name: "Good", color: "#f9a8d4", order: 3 },
        { id: "tier_meh", name: "Meh", color: "#cbd5e1", order: 4 },
      ],
      defaultBooks: [
        {
          title: "Двор шипов и роз",
          author: "Сара Дж. Маас",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Охотница попадает в мир фей и влюбляется в опасного лорда.",
          defaultTierId: "tier_otp",
        },
        {
          title: "Из крови и пепла",
          author: "Дженнифер Л. Арментроут",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Избранная девушка и её стражник между долгом и запретной любовью.",
          defaultTierId: "tier_otp",
        },
        {
          title: "Стеклянный трон",
          author: "Сара Дж. Маас",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Юная убийца сражается за свободу в магическом королевстве.",
          defaultTierId: "tier_fave",
        },
        {
          title: "Отчет ведьмы",
          author: "Алиса Хербст",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Ведьма в академии магии ищет своё место в мире.",
          defaultTierId: "tier_fave",
        },
        {
          title: "Королевство шипов и роз",
          author: "Кристин Кэш",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Принцесса должна выбрать жениха среди магических существ.",
          defaultTierId: "tier_good",
        },
        {
          title: "Зачарованные",
          author: "Марисса Мейер",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Сборник сказок в современном фэнтезийном мире.",
          defaultTierId: "tier_good",
        },
        {
          title: "Лунные хроники",
          author: "Марисса Мейер",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Кибернетическая Золушка спасает мир от чумы.",
          defaultTierId: "tier_meh",
        },
      ],
    },
  },
  // Фэнтези - Тёмное
  {
    id: 10,
    title: "ТЁМНОЕ ФЭНТЕЗИ",
    category: "Фэнтези",
    categoryId: "fantasy",
    uses: "12k",
    author: "DarkFantasyFan",
    image: "/images/templates/DarkFantasy.webp",
    size: "standard",
    type: "starter",
    borderColor: "#b91c1c", // accent-red
    templateData: {
      title: "Тёмное фэнтези",
      description: "Мрачные миры, антигерои и жестокие истории.",
      type: "starter",
      isPublic: false,
      tiers: [
        {
          id: "tier_masterpiece",
          name: "Masterpiece",
          color: "#7f1d1d",
          order: 1,
        },
        { id: "tier_dark", name: "Dark", color: "#b91c1c", order: 2 },
        {
          id: "tier_atmospheric",
          name: "Atmospheric",
          color: "#dc2626",
          order: 3,
        },
        { id: "tier_skip", name: "Skip", color: "#64748b", order: 4 },
      ],
      defaultBooks: [
        {
          title: "Ведьмак. Последнее желание",
          author: "Анджей Сапковский",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Мутант-охотник на монстров в мире без добра и зла.",
          defaultTierId: "tier_masterpiece",
        },
        {
          title: "Первый закон. Кровь и железо",
          author: "Джо Аберкромби",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Мрачное фэнтези о войне, интригах и моральном выборе.",
          defaultTierId: "tier_masterpiece",
        },
        {
          title: "Малазанская книга павших",
          author: "Стивен Эриксон",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Эпическая сага о богах, империях и древней магии.",
          defaultTierId: "tier_dark",
        },
        {
          title: "Ночной цирк",
          author: "Эрин Моргенштерн",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Магическое соперничество двух иллюзионистов в загадочном цирке.",
          defaultTierId: "tier_dark",
        },
        {
          title: "Дорога королей",
          author: "Брэндон Сандерсон",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Воины сражаются с древним злом в мире постоянных бурь.",
          defaultTierId: "tier_atmospheric",
        },
        {
          title: "Тёмная башня. Стрелок",
          author: "Стивен Кинг",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Последний стрелок преследует человека в чёрном через миры.",
          defaultTierId: "tier_atmospheric",
        },
        {
          title: "Книга Нового Солнца",
          author: "Джин Вулф",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Палач становится путешественником в умирающем мире.",
          defaultTierId: "tier_skip",
        },
      ],
    },
  },
  // Классика
  {
    id: 11,
    title: "КЛАССИЧЕСКАЯ ЛИТЕРАТУРА",
    category: "Классика",
    categoryId: "classics",
    uses: "28k",
    author: "ClassicReader",
    image: "/images/templates/Classics.webp",
    size: "tall",
    type: "curated",
    badge: { text: "Топ", color: "primary" },
    borderColor: "primary",
    templateData: {
      title: "Классическая литература",
      description: "Личное ранжирование классиков.",
      type: "curated",
      isPublic: false,
      tiers: [
        { id: "tier_master", name: "Шедевр", color: "#ef4444", order: 1 },
        { id: "tier_strong", name: "Сильно", color: "#f97316", order: 2 },
        { id: "tier_ok", name: "Неплохо", color: "#84cc16", order: 3 },
        { id: "tier_later", name: "Позже", color: "#3b82f6", order: 4 },
      ],
      defaultBooks: [
        {
          title: "Война и мир",
          author: "Лев Толстой",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Эпическое полотно о России в эпоху наполеоновских войн.",
          defaultTierId: "tier_master",
        },
        {
          title: "Анна Каренина",
          author: "Лев Толстой",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "История любви на фоне социальных перемен XIX века.",
          defaultTierId: "tier_master",
        },
        {
          title: "Мастер и Маргарита",
          author: "Михаил Булгаков",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Мистический роман о дьяволе в Москве 1930-х годов.",
          defaultTierId: "tier_master",
        },
        {
          title: "Преступление и наказание",
          author: "Фёдор Достоевский",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Психологический роман о студенте Раскольникове.",
          defaultTierId: "tier_strong",
        },
        {
          title: "Братья Карамазовы",
          author: "Фёдор Достоевский",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Философский роман о вере, семье и морали.",
          defaultTierId: "tier_strong",
        },
        {
          title: "Имя розы",
          author: "Умберто Эко",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Философский детектив в средневековом монастыре.",
          defaultTierId: "tier_ok",
        },
        {
          title: "Сто лет одиночества",
          author: "Габриэль Гарсиа Маркес",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Сага о роде Буэндиа в магическом реализме.",
          defaultTierId: "tier_later",
        },
      ],
    },
  },
  // Детективы
  {
    id: 5,
    title: "ТРИЛЛЕРЫ И ДЕТЕКТИВЫ",
    category: "Детективы",
    categoryId: "mystery",
    uses: "19k",
    author: "MysteryFan",
    image: "/images/templates/detectiv.webp",
    size: "standard",
    type: "starter",
    borderColor: "accent-blue",
    templateData: {
      title: "Триллеры и детективы",
      description: "Отметьте лучшие расследования и повороты.",
      type: "starter",
      isPublic: false,
      tiers: [
        { id: "tier_twist", name: "Twist", color: "#ef4444", order: 1 },
        { id: "tier_strong", name: "Strong", color: "#f97316", order: 2 },
        { id: "tier_ok", name: "OK", color: "#eab308", order: 3 },
        { id: "tier_skip", name: "Skip", color: "#64748b", order: 4 },
      ],
      defaultBooks: [
        {
          title: "Девушка с татуировкой дракона",
          author: "Стиг Ларссон",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Журналист и хакерша расследуют исчезновение девушки.",
          defaultTierId: "tier_twist",
        },
        {
          title: "Исчезнувшая",
          author: "Гиллиан Флинн",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Жена исчезает в годовщину свадьбы, муж становится главным подозреваемым.",
          defaultTierId: "tier_twist",
        },
        {
          title: "Убийство в Восточном экспрессе",
          author: "Агата Кристи",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Пуаро расследует убийство в застрявшем поезде.",
          defaultTierId: "tier_strong",
        },
        {
          title: "Десять негритят",
          author: "Агата Кристи",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Десять незнакомцев оказываются на острове и начинают умирать.",
          defaultTierId: "tier_strong",
        },
        {
          title: "Молчание ягнят",
          author: "Томас Харрис",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Агент ФБР консультируется с каннибалом для поимки маньяка.",
          defaultTierId: "tier_ok",
        },
        {
          title: "Шерлок Холмс. Этюд в багровых тонах",
          author: "Артур Конан Дойл",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Первое дело великого детектива и доктора Ватсона.",
          defaultTierId: "tier_ok",
        },
        {
          title: "Код да Винчи",
          author: "Дэн Браун",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Символог ищет разгадку тайны Святого Грааля.",
          defaultTierId: "tier_skip",
        },
      ],
    },
  },
  // Художественная литература
  {
    id: 12,
    title: "СОВРЕМЕННАЯ ПРОЗА",
    category: "Художественная",
    categoryId: "fiction",
    uses: "22k",
    author: "ProseLover",
    image: "/images/templates/Cofe.webp",
    size: "large",
    type: "starter",
    badge: { text: "Популярное", color: "accent-blue" },
    borderColor: "accent-blue",
    templateData: {
      title: "Современная проза",
      description: "Рейтинг современной художественной литературы.",
      type: "starter",
      isPublic: false,
      tiers: [
        { id: "tier_master", name: "Шедевр", color: "#ef4444", order: 1 },
        { id: "tier_great", name: "Отлично", color: "#f97316", order: 2 },
        { id: "tier_good", name: "Хорошо", color: "#eab308", order: 3 },
        { id: "tier_ok", name: "Нормально", color: "#84cc16", order: 4 },
      ],
      defaultBooks: [
        {
          title: "Щегол",
          author: "Донна Тартт",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Мальчик выживает после теракта в музее и хранит украденную картину.",
          defaultTierId: "tier_master",
        },
        {
          title: "Бегущий за ветром",
          author: "Халед Хоссейни",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Трогательная история дружбы в Афганистане.",
          defaultTierId: "tier_master",
        },
        {
          title: "Шантарам",
          author: "Грегори Дэвид Робертс",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Приключения беглого преступника в Бомбее.",
          defaultTierId: "tier_great",
        },
        {
          title: "Тень ветра",
          author: "Карлос Руис Сафон",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Мистический триллер в послевоенной Барселоне.",
          defaultTierId: "tier_great",
        },
        {
          title: "Жизнь Пи",
          author: "Ян Мартел",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Мальчик выживает в шлюпке с бенгальским тигром.",
          defaultTierId: "tier_good",
        },
        {
          title: "Вино из одуванчиков",
          author: "Рэй Брэдбери",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Ностальгическая история о лете детства.",
          defaultTierId: "tier_good",
        },
        {
          title: "Где ты, где ты?",
          author: "Марк Леви",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "История дружбы, проходящей через всю жизнь.",
          defaultTierId: "tier_ok",
        },
      ],
    },
  },
  {
    id: 13,
    title: "РУССКАЯ ПРОЗА",
    category: "Художественная",
    categoryId: "fiction",
    uses: "16k",
    author: "RussianLitFan",
    image: "/images/books/prosa.webp",
    size: "standard",
    type: "starter",
    borderColor: "primary",
    templateData: {
      title: "Русская проза",
      description: "Лучшие произведения русских авторов.",
      type: "starter",
      isPublic: false,
      tiers: [
        { id: "tier_classic", name: "Классика", color: "#ef4444", order: 1 },
        { id: "tier_modern", name: "Современная", color: "#f97316", order: 2 },
        { id: "tier_new", name: "Новая", color: "#22c55e", order: 3 },
      ],
      defaultBooks: [
        {
          title: "Мастер и Маргарита",
          author: "Михаил Булгаков",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Мистический роман о дьяволе в Москве 1930-х годов.",
          defaultTierId: "tier_classic",
        },
        {
          title: "Тихий Дон",
          author: "Михаил Шолохов",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Эпос о донском казачестве в годы революции.",
          defaultTierId: "tier_classic",
        },
        {
          title: "Доктор Живаго",
          author: "Борис Пастернак",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "История поэта в годы революции и гражданской войны.",
          defaultTierId: "tier_classic",
        },
        {
          title: "Архипелаг ГУЛАГ",
          author: "Александр Солженицын",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Художественно-документальное исследование репрессий.",
          defaultTierId: "tier_modern",
        },
        {
          title: "Москва-Петушки",
          author: "Венедикт Ерофеев",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Поэма о путешествии электричкой и смысле жизни.",
          defaultTierId: "tier_modern",
        },
        {
          title: "Generation П",
          author: "Виктор Пелевин",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Сатира о поколении 90-х и рекламе в новой России.",
          defaultTierId: "tier_new",
        },
        {
          title: "Лавр",
          author: "Евгений Водолазкин",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Роман о целителе в средневековой Руси.",
          defaultTierId: "tier_new",
        },
      ],
    },
  },
  // Нон-фикшн
  {
    id: 14,
    title: "НАУКА И ПОЗНАНИЕ",
    category: "Нон-фикшн",
    categoryId: "non-fiction",
    uses: "11k",
    author: "ScienceBuff",
    image: "/images/templates/Brain.webp",
    size: "standard",
    type: "starter",
    borderColor: "accent-green",
    templateData: {
      title: "Наука и познание",
      description: "Научные книги и научно-популярная литература.",
      type: "starter",
      isPublic: false,
      tiers: [
        {
          id: "tier_revolution",
          name: "Революционное",
          color: "#8b5cf6",
          order: 1,
        },
        {
          id: "tier_fundamental",
          name: "Фундаментальное",
          color: "#a855f7",
          order: 2,
        },
        { id: "tier_popular", name: "Популярное", color: "#c084fc", order: 3 },
      ],
      defaultBooks: [
        {
          title: "Sapiens. Краткая история человечества",
          author: "Юваль Ной Харари",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "От каменного века до наших дней: как Homo sapiens стал хозяином планеты.",
          defaultTierId: "tier_revolution",
        },
        {
          title: "Краткая история времени",
          author: "Стивен Хокинг",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "От Большого взрыва до чёрных дыр: просто о сложном.",
          defaultTierId: "tier_revolution",
        },
        {
          title: "Происхождение видов",
          author: "Чарльз Дарвин",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Фундаментальный труд об эволюции и естественном отборе.",
          defaultTierId: "tier_fundamental",
        },
        {
          title: "Структура научных революций",
          author: "Томас Кун",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Философия науки и смена парадигм.",
          defaultTierId: "tier_fundamental",
        },
        {
          title: "Космос",
          author: "Карл Саган",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Путешествие по Вселенной с великим популяризатором науки.",
          defaultTierId: "tier_popular",
        },
        {
          title: "Сапиенс. Иллюстрированная история",
          author: "Юваль Ной Харари",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Иллюстрированная версия бестселлера о истории человечества.",
          defaultTierId: "tier_popular",
        },
        {
          title: "Физика невозможного",
          author: "Митио Каку",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Научный взгляд на телепортацию, машины времени и другие технологии.",
          defaultTierId: "tier_popular",
        },
      ],
    },
  },
  {
    id: 15,
    title: "БИЗНЕС И САМОРАЗВИТИЕ",
    category: "Нон-фикшн",
    categoryId: "non-fiction",
    uses: "34k",
    author: "SelfGrowth",
    image: "/images/templates/Bussines.webp",
    size: "tall",
    type: "starter",
    badge: { text: "Бестселлер", color: "accent-orange" },
    borderColor: "accent-orange",
    templateData: {
      title: "Бизнес и саморазвитие",
      description: "Книги для личностного роста и бизнеса.",
      type: "starter",
      isPublic: false,
      tiers: [
        { id: "tier_must", name: "Must Read", color: "#f59e0b", order: 1 },
        {
          id: "tier_recommend",
          name: "Рекомендую",
          color: "#22c55e",
          order: 2,
        },
        { id: "tier_once", name: "Прочитать", color: "#3b82f6", order: 3 },
      ],
      defaultBooks: [
        {
          title: "Атомные привычки",
          author: "Джеймс Клир",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Практическое руководство по формированию полезных привычек.",
          defaultTierId: "tier_must",
        },
        {
          title: "Думай медленно... решай быстро",
          author: "Даниэль Канеман",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Нобелевский лауреат о двух системах мышления.",
          defaultTierId: "tier_must",
        },
        {
          title: "Богатый папа, бедный папа",
          author: "Роберт Кийосаки",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Финансовая грамотность и мышление богатого человека.",
          defaultTierId: "tier_recommend",
        },
        {
          title: "7 навыков высокоэффективных людей",
          author: "Стивен Кови",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Принципы личной эффективности от классика self-help.",
          defaultTierId: "tier_recommend",
        },
        {
          title: "Как завоевывать друзей",
          author: "Дейл Карнеги",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Классика о влиянии на людей и построении отношений.",
          defaultTierId: "tier_recommend",
        },
        {
          title: "Сила воли",
          author: "Келли Макгонигал",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Научный подход к развитию самоконтроля.",
          defaultTierId: "tier_once",
        },
        {
          title: "Магия утра",
          author: "Хэл Элрод",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Как первые часы дня определяют ваш успех.",
          defaultTierId: "tier_once",
        },
      ],
    },
  },
  // Sci-Fi
  {
    id: 16,
    title: "НАУЧНАЯ ФАНТАСТИКА",
    category: "Sci-Fi",
    categoryId: "sci-fi",
    uses: "27k",
    author: "SciFiFan",
    image: "/images/templates/fantasy.webp",
    size: "large",
    type: "curated",
    badge: { text: "Sci-Fi", color: "accent-blue" },
    borderColor: "accent-blue",
    templateData: {
      title: "Научная фантастика",
      description: "Космос, технологии и будущее.",
      type: "curated",
      isPublic: false,
      tiers: [
        { id: "tier_masterpiece", name: "Шедевр", color: "#0ea5e9", order: 1 },
        { id: "tier_great", name: "Отлично", color: "#38bdf8", order: 2 },
        { id: "tier_good", name: "Хорошо", color: "#7dd3fc", order: 3 },
        { id: "tier_meh", name: "Так себе", color: "#64748b", order: 4 },
      ],
      defaultBooks: [
        {
          title: "Дюна",
          author: "Фрэнк Герберт",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Эпическая сага о пустынной планете Арракис и борьбе за меланж.",
          defaultTierId: "tier_masterpiece",
        },
        {
          title: "Основание",
          author: "Айзек Азимов",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Грандиозная сага о падении Галактической Империи.",
          defaultTierId: "tier_masterpiece",
        },
        {
          title: "1984",
          author: "Джордж Оруэлл",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Антиутопия о тоталитарном обществе под контролем Большого Брата.",
          defaultTierId: "tier_great",
        },
        {
          title: "О дивный новый мир",
          author: "Олдос Хаксли",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Антиутопия о мире, где люди выращиваются в пробирках.",
          defaultTierId: "tier_great",
        },
        {
          title: "Марсианин",
          author: "Энди Вейер",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Астронавт выживает на Марсе в одиночку.",
          defaultTierId: "tier_good",
        },
        {
          title: "Контакт",
          author: "Карл Саган",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Учёные получают сигнал от внеземной цивилизации.",
          defaultTierId: "tier_good",
        },
        {
          title: "Солярис",
          author: "Станислав Лем",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Психологическая фантастика о разумном океане.",
          defaultTierId: "tier_meh",
        },
      ],
    },
  },
  {
    id: 17,
    title: "КИБЕРПАНК",
    category: "Sci-Fi",
    categoryId: "sci-fi",
    uses: "14k",
    author: "CyberPunkFan",
    image: "/images/templates/Cyberpank.webp",
    size: "standard",
    type: "starter",
    borderColor: "accent-purple",
    templateData: {
      title: "Киберпанк",
      description: "Высокие технологии и низкая жизнь.",
      type: "starter",
      isPublic: false,
      tiers: [
        { id: "tier_classic", name: "Классика", color: "#a855f7", order: 1 },
        { id: "tier_modern", name: "Современное", color: "#c084fc", order: 2 },
        { id: "tier_other", name: "Другое", color: "#e9d5ff", order: 3 },
      ],
      defaultBooks: [
        {
          title: "Нейромант",
          author: "Уильям Гибсон",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Хакер Кейс погружается в матрицу для выполнения опасного задания.",
          defaultTierId: "tier_classic",
        },
        {
          title: "Мечтают ли андроиды об электроовцах?",
          author: "Филип К. Дик",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Охотник за головами преследует андроидов в постапокалиптическом мире.",
          defaultTierId: "tier_classic",
        },
        {
          title: "Снег",
          author: "Нил Стивенсон",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Курьер и хакер в мире, где корпорации заменили государства.",
          defaultTierId: "tier_modern",
        },
        {
          title: "Алита",
          author: "Юкито Кисиро",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Киборг-девочка ищет своё прошлое в мире свалки.",
          defaultTierId: "tier_modern",
        },
        {
          title: "Видоизменённый углерод",
          author: "Ричард К. Морган",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "В мире, где сознание можно переносить, расследуют убийство.",
          defaultTierId: "tier_other",
        },
        {
          title: "Лавина",
          author: "Нил Стивенсон",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Вирус в метавселенной угрожает реальному миру.",
          defaultTierId: "tier_other",
        },
        {
          title: "Светлячок",
          author: "Джосс Уидон",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Команда контрабандистов в мире после межпланетной войны.",
          defaultTierId: "tier_other",
        },
      ],
    },
  },
  {
    id: 18,
    title: "КОСМИЧЕСКАЯ ОПЕРА",
    category: "Sci-Fi",
    categoryId: "sci-fi",
    uses: "9k",
    author: "SpaceOperaFan",
    image: "/images/templates/CosmOpera.webp",
    size: "standard",
    type: "starter",
    borderColor: "accent-blue",
    templateData: {
      title: "Космическая опера",
      description: "Галактические войны и приключения в космосе.",
      type: "starter",
      isPublic: false,
      tiers: [
        { id: "tier_epic", name: "Эпическое", color: "#0ea5e9", order: 1 },
        { id: "tier_good", name: "Хорошее", color: "#38bdf8", order: 2 },
        { id: "tier_average", name: "Среднее", color: "#7dd3fc", order: 3 },
      ],
      defaultBooks: [
        {
          title: "Гиперион",
          author: "Дэн Симмонс",
          coverImageUrl: "/images/books/placeholder.svg",
          description:
            "Семь паломников отправляются к Гипериону в поисках ответов.",
          defaultTierId: "tier_epic",
        },
        {
          title: "Песнь о Лейбовице",
          author: "Уолтер М. Миллер",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Монахи сохраняют знания после ядерного апокалипсиса.",
          defaultTierId: "tier_epic",
        },
        {
          title: "Звёздный десант",
          author: "Роберт Хайнлайн",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Военная фантастика о войне с насекомыми-арахнидами.",
          defaultTierId: "tier_good",
        },
        {
          title: "Вавилон-5",
          author: "Дж. Майкл Стражински",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Космическая станция как центр дипломатии и конфликтов.",
          defaultTierId: "tier_good",
        },
        {
          title: "Вселенная Метро 2033",
          author: "Дмитрий Глуховский",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Выживание в московском метро после ядерной войны.",
          defaultTierId: "tier_average",
        },
        {
          title: "Аннигиляция",
          author: "Джефф Вандермеер",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Экспедиция в Зону Икс, где природа мутирует.",
          defaultTierId: "tier_average",
        },
        {
          title: "Проблема трёх тел",
          author: "Лю Цысинь",
          coverImageUrl: "/images/books/placeholder.svg",
          description: "Китайская НФ о контакте с инопланетной цивилизацией.",
          defaultTierId: "tier_average",
        },
      ],
    },
  },
];

export const COLLECTIONS: CollectionItem[] = [
  {
    id: 1,
    title: "Лауреаты Нобелевской премии",
    content: `<h2>Нобелевская премия по литературе</h2>
<p>Нобелевская премия по литературе — одна из самых престижных наград в мире, вручающаяся ежегодно с <strong>1901 года</strong> за выдающиеся достижения в области литературы.</p>

<h3>Русские лауреаты</h3>
<ul>
  <li><strong>Иван Бунин (1933)</strong> — первый русский писатель, получивший Нобелевскую премию «за строгое мастерство, с которым он развивает традиции русской классической прозы».</li>
  <li><strong>Борис Пастернак (1958)</strong> — награждён «за значительные достижения в современной лирической поэзии, а также за продолжение традиций великого русского эпического романа» (роман «Доктор Живаго»). От премии отказался под давлением властей.</li>
  <li><strong>Михаил Шолохов (1965)</strong> — получил премию «за художественную силу и цельность эпоса о донском казачестве в переломное для России время» (роман «Тихий Дон»).</li>
  <li><strong>Александр Солженицын (1970)</strong> — награждён «за нравственную силу, с которой он следовал непреложным традициям русской литературы» («Архипелаг ГУЛАГ», «В круге первом»).</li>
  <li><strong>Иосиф Бродский (1987)</strong> — получил премию «за всеобъемлющее творчество, пронизанное ясностью мысли и страстностью поэтического воображения».</li>
</ul>

<h3>Известные лауреаты разных лет</h3>
<ul>
  <li><strong>Эрнест Хемингуэй (1954)</strong> — «за мастерство в искусстве повествования».</li>
  <li><strong>Габриэль Гарсиа Маркес (1982)</strong> — «за романы и рассказы, в которых фантазия и реальность сочетаются в мире воображения».</li>
  <li><strong>Тони Моррисон (1993)</strong> — первая афроамериканская писательница, получившая премию.</li>
  <li><strong>Кадзуо Исигуро (2017)</strong> — «за романы огромной эмоциональной силы».</li>
</ul>`,
    excerpt:
      "Полная история русских и зарубежных лауреатов Нобелевской премии по литературе с 1901 года.",
    coverImageUrl: "/images/collections/nobel-prize.webp",
    bookCovers: [
      "/images/books/bunin-medium.webp",
      "/images/books/pasternak-medium.webp",
      "/images/books/sholohov-medium.webp",
    ],
    tags: ["Нобелевская премия", "Классика", "Лауреаты"],
    isPublished: true,
    order: 1,
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-03-20T14:30:00Z",
  },
  {
    id: 2,
    title: "Фавориты BookStrata",
    content: `<h2>Выбор сообщества BookStrata</h2>
<p>Эта подборка создана на основе голосов и рекомендаций нашего сообщества. Здесь собраны книги, которые получили наибольшее количество положительных отзывов и высоких оценок.</p>

<h3>Как формируется рейтинг</h3>
<p>Каждую неделю пользователи BookStrata оценивают прочитанные книги, создают свои тир-листы и делятся рекомендациями. Книги с наивысшим средним рейтингом и наибольшим количеством оценок попадают в эту подборку.</p>

<h3>Топ-5 книг месяца</h3>
<ol>
  <li><strong>«Шантарам» Грегори Дэвид Робертс</strong> — приключенческий роман о беглом преступнике в Бомбее.</li>
  <li><strong>«Тень ветра» Карлос Руис Сафон</strong> — мистический триллер в послевоенной Барселоне.</li>
  <li><strong>«Ночной цирк» Эрин Моргенштерн</strong> — волшебная история о соперничестве двух иллюзионистов.</li>
  <li><strong>«Щегол» Донна Тартт</strong> — роман о взрослении и искусстве.</li>
  <li><strong>«Бегущий за ветром» Халед Хоссейни</strong> — трогательная история дружбы в Афганистане.</li>
</ol>`,
    excerpt:
      "Книги, которые получили highest оценки от сообщества BookStrata в этом месяце.",
    coverImageUrl: "/images/collections/2026-hero.webp",
    bookCovers: [
      "/images/books/placeholder.svg",
      "/images/books/placeholder.svg",
      "/images/books/placeholder.svg",
    ],
    tags: ["Популярное", "Выбор читателей", "Топ"],
    isPublished: true,
    order: 2,
    createdAt: "2026-02-01T09:00:00Z",
    updatedAt: "2026-03-22T11:15:00Z",
  },
  {
    id: 3,
    title: "Историческая проза",
    content: `<h2>Лучшие произведения в жанре исторической прозы</h2>
<p>Историческая проза — это литературные произведения, в которых действие происходит в прошлом. Авторы тщательно воссоздают атмосферу эпохи, быт, нравы и исторические события.</p>

<h3>Классика жанра</h3>
<ul>
  <li><strong>«Война и мир» Лев Толстой</strong> — эпическое полотно о России в эпоху наполеоновских войн.</li>
  <li><strong>«Анна Каренина» Лев Толстой</strong> — история любви на фоне социальных перемен XIX века.</li>
  <li><strong>«Имя розы» Умберто Эко</strong> — философский детектив в средневековом монастыре.</li>
</ul>

<h3>Современная историческая проза</h3>
<ul>
  <li><strong>«Книжный вор» Маркус Зусак</strong> — история девочки в нацистской Германии, рассказанная Смертью.</li>
  <li><strong>«Всеобщая история бандитов» Леонардо Падура</strong> — криминальные истории из Гаваны.</li>
  <li><strong>«Переводчик с французского» Андрей Битов</strong> — размышления о культуре и истории России.</li>
</ul>

<h3>Почему стоит читать историческую прозу</h3>
<p>Исторические романы позволяют погрузиться в другую эпоху, понять мышление людей прошлого и увидеть параллели с современностью. Это не только развлечение, но и способ лучше понять историю через судьбы конкретных людей.</p>`,
    excerpt:
      "Погрузитесь в разные эпохи через лучшие произведения исторической прозы — от классики до современности.",
    coverImageUrl: "/images/collections/prosa-hero.webp",
    bookCovers: [
      "/images/books/prosa-medium.webp",
      "/images/books/prosa1-medium.webp",
      "/images/books/prosa3-medium.webp",
    ],
    tags: ["Историческая проза", "Классика", "Современная литература"],
    isPublished: true,
    order: 3,
    createdAt: "2026-02-10T12:00:00Z",
    updatedAt: "2026-03-23T16:45:00Z",
  },
];

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: 1,
    title: "Новые шаблоны недели: фэнтези, классика и sci‑fi",
    excerpt: "Собрали свежие подборки, которые быстрее всего набирают оценки.",
    tag: "Обновление",
    readTime: "2 мин",
  },
  {
    id: 2,
    title: "Комьюнити‑лист: лучшие подборки марта",
    excerpt: "Смотрите топ‑рейтинги и идеи, как оформить свой тир‑лист.",
    tag: "Комьюнити",
    readTime: "3 мин",
  },
  {
    id: 3,
    title: "Как делать компактные шаблоны без потери качества",
    excerpt: "Мини‑гайд по оптимизации изображений и структуры списков.",
    tag: "Гайд",
    readTime: "4 мин",
  },
];
