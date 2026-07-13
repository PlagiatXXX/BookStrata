// src/data/mockData.ts
// Mock-данные для шаблонов, коллекций и новостей
import {
  BookOpen,
  Book as BookIcon,
  History,
  Landmark,
  Rocket,
  SearchCheck,
  TrendingUp,
} from "lucide-react";
import type { Book, Tier } from "@/types";
import type { CreateTemplateData } from "@/types/templates";
import { CATEGORIES as BASE_CATEGORIES } from "./categories";

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
  slug: string;
  title: string;
  type: "curated" | "literary"; // curated = тир-лист, literary = HTML-статья
  categoryId?: string | null;
  // Для curated (тир-лист):
  tiers?: Record<string, Tier>;
  tierOrder?: string[];
  books?: Record<string, Book>;
  unrankedBookIds?: string[];
  // Для literary (статья):
  content?: string; // HTML-контент
  // Общие:
  excerpt?: string;
  isFeatured: boolean;
  editorialNote?: string | null; // Редакционная заметка (содержит текст "Почему именно эти книги?")
  coverImageUrl: string;
  bookCovers?: string[]; // Массив обложек книг (3-4 шт), для превью
  tags: string[];
  isPublished: boolean;
  order: number;
  accentColor?: string; // Цветовая акцентная подсветка карточки (hex)
  createdAt: string;
  updatedAt: string;
};

/** Палитра акцентных цветов для карточек коллекций */
export const COLLECTION_ACCENTS = [
  '#f97316', // оранжевый (текущий accent-main)
  '#ef4444', // красный
  '#ec4899', // розовый
  '#a855f7', // фиолетовый
  '#6366f1', // индиго
  '#3b82f6', // синий
  '#06b6d4', // циан
  '#14b8a6', // бирюзовый
  '#22c55e', // зелёный
  '#eab308', // жёлтый
] as const;

const CATEGORY_ICONS: Record<string, typeof TrendingUp> = {
  fantasy: BookOpen,
  "sci-fi": Rocket,
  classics: Landmark,
  "non-fiction": History,
  fiction: BookIcon,
  "young-adult": BookIcon,
  historical: Landmark,
  horror: BookOpen,
  cyberpunk: Rocket,
  romance: BookIcon,
  "slavic-fantasy": BookOpen,
  adventure: BookIcon,
  thriller: SearchCheck,
  dystopia: Rocket,
  japanese: BookIcon,
  "russian-classics": Landmark,
  "foreign-prose": BookIcon,
  military: BookIcon,
  myths: Landmark,
};

export const CATEGORIES = BASE_CATEGORIES.map((cat) => ({
  ...cat,
  icon: cat.id === "all" ? TrendingUp : (CATEGORY_ICONS[cat.id] || BookOpen),
}));

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
          coverImageUrl: "/images/books/vlastelin-kolets.webp",
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
          coverImageUrl: "/images/books/garri-potter-i-filosofskiy-kamen.webp",
          description:
            "Первая книга о мальчике-волшебнике и его приключениях в Хогвартсе.",
          defaultTierId: "tier_a",
          googleBooksId: "1234567892",
        },
        {
          title: "Убить пересмешника",
          author: "Харпер Ли",
          coverImageUrl: "/images/books/ubit-peresmeshnika.webp",
          description:
            "Роман о расовой несправедливости в американском Юге глазами ребёнка.",
          defaultTierId: "tier_a",
          googleBooksId: "1234567893",
        },
        {
          title: "Над пропастью во ржи",
          author: "Дж. Д. Сэлинджер",
          coverImageUrl: "/images/books/nad-propastyu-vo-rzhi.webp",
          description:
            "История подростка Холдена Колфилда, бунтующего против фальши взрослого мира.",
          defaultTierId: "tier_b",
          googleBooksId: "1234567894",
        },
        {
          title: "Великий Гэтсби",
          author: "Ф. Скотт Фицджеральд",
          coverImageUrl: "/images/books/velikiy-getsbi.webp",
          description:
            "Трагическая история любви и американской мечты в эпоху джаза.",
          defaultTierId: "tier_b",
          googleBooksId: "1234567895",
        },
        {
          title: "Повелитель мух",
          author: "Уильям Голдинг",
          coverImageUrl: "/images/books/povelitel-mukh.webp",
          description:
            "Группа детей оказывается на необитаемом острове и создаёт своё общество.",
          defaultTierId: "tier_c",
          googleBooksId: "1234567896",
        },
        {
          title: "Преступление и наказание",
          author: "Фёдор Достоевский",
          coverImageUrl: "/images/books/prestuplenie-i-nakazanie.webp",
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
          coverImageUrl: "/images/books/atomnye-privychki.webp",
          description:
            "Практическое руководство по формированию полезных привычек.",
          defaultTierId: "tier_gold",
        },
        {
          title: "Sapiens. Краткая история человечества",
          author: "Юваль Ной Харари",
          coverImageUrl: "/images/books/sapiens-kratkaya-istoriya-chelovechestva.webp",
          description:
            "От каменного века до наших дней: как Homo sapiens стал хозяином планеты.",
          defaultTierId: "tier_gold",
        },
        {
          title: "Думай медленно... решай быстро",
          author: "Даниэль Канеман",
          coverImageUrl: "/images/books/dumay-medlenno-reshay-bystro.webp",
          description: "Нобелевский лауреат о двух системах мышления.",
          defaultTierId: "tier_silver",
        },
        {
          title: "Краткая история времени",
          author: "Стивен Хокинг",
          coverImageUrl: "/images/books/kratkaya-istoriya-vremeni.webp",
          description: "От Большого взрыва до чёрных дыр: просто о сложном.",
          defaultTierId: "tier_silver",
        },
        {
          title: "Богатый папа, бедный папа",
          author: "Роберт Кийосаки",
          coverImageUrl: "/images/books/bogatyy-papa-bednyy-papa.webp",
          description: "Финансовая грамотность и мышление богатого человека.",
          defaultTierId: "tier_bronze",
        },
        {
          title: "7 навыков высокоэффективных людей",
          author: "Стивен Кови",
          coverImageUrl: "/images/books/7-navykov-vysokoeffektivnykh-lyudey.webp",
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
          coverImageUrl: "/images/books/shantaram.webp",
          description: "Приключения беглого преступника в Бомбее.",
          defaultTierId: "tier_hot",
        },
        {
          title: "Тень ветра",
          author: "Карлос Руис Сафон",
          coverImageUrl: "/images/books/shadow-wind.webp",
          description: "Мистический триллер в послевоенной Барселоне.",
          defaultTierId: "tier_hot",
        },
        {
          title: "Ночной цирк",
          author: "Эрин Моргенштерн",
          coverImageUrl: "/images/books/circus.webp",
          description: "Волшебная история о соперничестве иллюзионистов.",
          defaultTierId: "tier_trending",
        },
        {
          title: "Щегол",
          author: "Донна Тартт",
          coverImageUrl: "/images/books/schegol.webp",
          description: "Роман о взрослении и искусстве.",
          defaultTierId: "tier_trending",
        },
        {
          title: "Бегущий за ветром",
          author: "Халед Хоссейни",
          coverImageUrl: "/images/books/beguschiy-za-vetrom.webp",
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
          coverImageUrl: "/images/books/voyna-i-mir.webp",
          description:
            "Эпическое полотно о России в эпоху наполеоновских войн.",
          defaultTierId: "tier_master",
        },
        {
          title: "Анна Каренина",
          author: "Лев Толстой",
          coverImageUrl: "/images/books/anna-karenina.webp",
          description: "История любви на фоне социальных перемен XIX века.",
          defaultTierId: "tier_master",
        },
        {
          title: "Преступление и наказание",
          author: "Фёдор Достоевский",
          coverImageUrl: "/images/books/prestuplenie-i-nakazanie.webp",
          description: "Психологический роман о студенте Раскольникове.",
          defaultTierId: "tier_strong",
        },
        {
          title: "Братья Карамазовы",
          author: "Фёдор Достоевский",
          coverImageUrl: "/images/books/bratya-karamazovy.webp",
          description: "Философский роман о вере, семье и морали.",
          defaultTierId: "tier_strong",
        },
        {
          title: "Мастер и Маргарита",
          author: "Михаил Булгаков",
          coverImageUrl: "/images/books/master-i-margarita.webp",
          description: "Мистический роман о дьяволе в Москве 1930-х годов.",
          defaultTierId: "tier_master",
        },
        {
          title: "Имя розы",
          author: "Умберто Эко",
          coverImageUrl: "/images/books/imya-rozy.webp",
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
          coverImageUrl: "/images/books/vlastelin-kolets.webp",
          description: "Эпическое фэнтези о хоббите Фродо и Кольце Всевластия.",
          defaultTierId: "tier_legend",
        },
        {
          title: "Ведьмак. Последнее желание",
          author: "Анджей Сапковский",
          coverImageUrl: "/images/books/vedmak-poslednee-zhelanie.webp",
          description: "Истории о ведьмаке Геральте из Ривии.",
          defaultTierId: "tier_legend",
        },
        {
          title: "Имя Ветра",
          author: "Патрик Ротфусс",
          coverImageUrl: "/images/books/imya-vetra.webp",
          description: "Легендарная хроника Квоута, рассказанная им самим.",
          defaultTierId: "tier_epic",
        },
        {
          title: "Путь Королей",
          author: "Брэндон Сандерсон",
          coverImageUrl: "/images/books/put-koroley.webp",
          description: "Эпическое фэнтези о войне, чести и магии на Рошаре.",
          defaultTierId: "tier_epic",
        },
        {
          title: "Гарри Поттер и философский камень",
          author: "Дж. К. Роулинг",
          coverImageUrl: "/images/books/garri-potter-i-filosofskiy-kamen.webp",
          description: "Первая книга о мальчике-волшебнике.",
          defaultTierId: "tier_good",
        },
        {
          title: "Хроники Нарнии. Лев, колдунья и платяной шкаф",
          author: "К. С. Льюис",
          coverImageUrl: "/images/books/khroniki-narnii-lev-koldunya-i-platyanoy.webp",
          description:
            "Дети попадают в волшебную страну Нарнию через платяной шкаф.",
          defaultTierId: "tier_good",
        },
        {
          title: "Колесо Времени. Око мира",
          author: "Роберт Джордан",
          coverImageUrl: "/images/books/koleso-vremeni-oko-mira.webp",
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
          coverImageUrl: "/images/books/shesterka-voronov.webp",
          description:
            "Команда преступников пытается совершить невозможное ограбление в магическом мире.",
          defaultTierId: "tier_s",
        },
        {
          title: "Двор шипов и роз",
          author: "Сара Дж. Маас",
          coverImageUrl: "/images/books/dvor-shipov-i-roz.webp",
          description:
            "Девушка попадает в мир фей и обнаруживает скрытую силу.",
          defaultTierId: "tier_s",
        },
        {
          title: "Голодные игры",
          author: "Сьюзен Коллинз",
          coverImageUrl: "/images/books/golodnye-igry.webp",
          description:
            "Девушка добровольно участвует в смертельных играх вместо сестры.",
          defaultTierId: "tier_a",
        },
        {
          title: "Дивергент",
          author: "Вероника Рот",
          coverImageUrl: "/images/books/divergent.webp",
          description:
            "В мире фракций девушка обнаруживает, что не вписывается ни в одну из них.",
          defaultTierId: "tier_a",
        },
        {
          title: "Бегущий по Лабиринту",
          author: "Джеймс Дашнер",
          coverImageUrl: "/images/books/labirint.webp",
          description:
            "Подростки заперты в гигантском лабиринте и пытаются найти выход.",
          defaultTierId: "tier_b",
        },
        {
          title: "Тёмные начала",
          author: "Филип Пулман",
          coverImageUrl: "/images/books/temnye-nachala.webp",
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
          coverImageUrl: "/images/books/legendarnyy-lunnyy-skulptor.webp",
          description:
            "Игрок становится легендарным скульптором в виртуальной реальности.",
          defaultTierId: "tier_god",
        },
        {
          title: "От чужих берегов",
          author: "Андрей Круз",
          coverImageUrl: "/images/books/overgir.webp",
          description:
            "Пока кто-то смиренно прячется в бункерах и подземельях, главный герой вместе со своими боевыми товарищами храбро отстреливается от мутантов и зомби.",
          defaultTierId: "tier_god",
        },
        {
          title: "Играть, чтобы жить",
          author: "Дмитрий Рус",
          coverImageUrl: "/images/books/igrat-chtoby-zhit.webp",
          description:
            "Смертельно болен и вынужден играть в виртуальную игру для выживания.",
          defaultTierId: "tier_op",
        },
        {
          title: "Путь Шамана",
          author: "Василь Маханенко",
          coverImageUrl: "/images/books/put-shamana.webp",
          description:
            "Игрок выбирает непопулярный класс шамана и становится легендой.",
          defaultTierId: "tier_op",
        },
        {
          title: "Создатель кошмаров",
          author: "Алексей Пехов",
          coverImageUrl: "/images/books/konstruktor-mirov.webp",
          description:
            "Герой создаёт собственные миры с уникальными правилами.",
          defaultTierId: "tier_strong",
        },
        {
          title: "Странники",
          author: "Андрей и Мария Круз",
          coverImageUrl: "/images/books/fenterra.webp",
          description:
            "Миров и их версий бесконечно много, но есть закономерности, которым подчинены путешествия между мирами.",
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
          coverImageUrl: "/images/books/dvor-shipov-i-roz.webp",
          description:
            "Охотница попадает в мир фей и влюбляется в опасного лорда.",
          defaultTierId: "tier_otp",
        },
        {
          title: "Из крови и пепла",
          author: "Дженнифер Л. Арментроут",
          coverImageUrl: "/images/books/iz-krovi-i-pepla.webp",
          description:
            "Избранная девушка и её стражник между долгом и запретной любовью.",
          defaultTierId: "tier_otp",
        },
        {
          title: "Стеклянный трон",
          author: "Сара Дж. Маас",
          coverImageUrl: "/images/books/steklyannyy-tron.webp",
          description:
            "Юная убийца сражается за свободу в магическом королевстве.",
          defaultTierId: "tier_fave",
        },
        {
          title: "Четвертое крыло",
          author: "Ребекка Яррос",
          coverImageUrl: "/images/books/krylo.webp",
          description:
            "Главная героиня, хрупкая девушка с болезнью суставов, попадает в самое опасное место.",
          defaultTierId: "tier_good",
        },
        {
          title: "Одно темное окно",
          author: "Рейчел Гиллиг",
          coverImageUrl: "/images/books/okno.webp",
          description:
            "Главная героиня делит свое тело с пугающим, но защищающим её духом.",
          defaultTierId: "tier_good",
        },
        {
          title: "Проклятие",
          author: "Марисса Мейер",
          coverImageUrl: "/images/books/proklyatiya.webp",
          description: "Это незабываемое путешествие в уникальный, темный мир.",
          defaultTierId: "tier_good",
        },
        {
          title: "Лунные хроники. Золушка",
          author: "Марисса Мейер",
          coverImageUrl: "/images/books/lunnye-khroniki.webp",
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
    borderColor: "#b91c1c",
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
          coverImageUrl: "/images/books/vedmak-poslednee-zhelanie.webp",
          description: "Мутант-охотник на монстров в мире без добра и зла.",
          defaultTierId: "tier_masterpiece",
        },
        {
          title: "Первый закон. Кровь и железо",
          author: "Джо Аберкромби",
          coverImageUrl: "/images/books/pervyy-zakon-krov-i-zhelezo.webp",
          description: "Мрачное фэнтези о войне, интригах и моральном выборе.",
          defaultTierId: "tier_masterpiece",
        },
        {
          title: "Малазанская книга павших",
          author: "Стивен Эриксон",
          coverImageUrl: "/images/books/malazanskaya-kniga-pavshikh.webp",
          description: "Эпическая сага о богах, империях и древней магии.",
          defaultTierId: "tier_dark",
        },
        {
          title: "Ночной цирк",
          author: "Эрин Моргенштерн",
          coverImageUrl: "/images/books/circus.webp",
          description:
            "Магическое соперничество двух иллюзионистов в загадочном цирке.",
          defaultTierId: "tier_dark",
        },
        {
          title: "Путь королей",
          author: "Брэндон Сандерсон",
          coverImageUrl: "/images/books/doroga-koroley.webp",
          description: "Воины сражаются с древним злом в мире постоянных бурь.",
          defaultTierId: "tier_atmospheric",
        },
        {
          title: "Тёмная башня. Стрелок",
          author: "Стивен Кинг",
          coverImageUrl: "/images/books/temnaya-bashnya-strelok.webp",
          description:
            "Последний стрелок преследует человека в чёрном через миры.",
          defaultTierId: "tier_atmospheric",
        },
        {
          title: "Книга Нового Солнца",
          author: "Джин Вулф",
          coverImageUrl: "/images/books/kniga-novogo-solntsa.webp",
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
          coverImageUrl: "/images/books/voyna-i-mir.webp",
          description:
            "Эпическое полотно о России в эпоху наполеоновских войн.",
          defaultTierId: "tier_master",
        },
        {
          title: "Анна Каренина",
          author: "Лев Толстой",
          coverImageUrl: "/images/books/anna-karenina.webp",
          description: "История любви на фоне социальных перемен XIX века.",
          defaultTierId: "tier_master",
        },
        {
          title: "Мастер и Маргарита",
          author: "Михаил Булгаков",
          coverImageUrl: "/images/books/master-i-margarita.webp",
          description: "Мистический роман о дьяволе в Москве 1930-х годов.",
          defaultTierId: "tier_master",
        },
        {
          title: "Преступление и наказание",
          author: "Фёдор Достоевский",
          coverImageUrl: "/images/books/prestuplenie-i-nakazanie.webp",
          description: "Психологический роман о студенте Раскольникове.",
          defaultTierId: "tier_strong",
        },
        {
          title: "Братья Карамазовы",
          author: "Фёдор Достоевский",
          coverImageUrl: "/images/books/bratya-karamazovy.webp",
          description: "Философский роман о вере, семье и морали.",
          defaultTierId: "tier_strong",
        },
        {
          title: "Имя розы",
          author: "Умберто Эко",
          coverImageUrl: "/images/books/imya-rozy.webp",
          description: "Философский детектив в средневековом монастыре.",
          defaultTierId: "tier_ok",
        },
        {
          title: "Сто лет одиночества",
          author: "Габриэль Гарсиа Маркес",
          coverImageUrl: "/images/books/sto-let-odinochestva.webp",
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
    categoryId: "thriller",
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
          coverImageUrl: "/images/books/devushka-s-tatuirovkoy-drakona.webp",
          description: "Журналист и хакерша расследуют исчезновение девушки.",
          defaultTierId: "tier_twist",
        },
        {
          title: "Исчезнувшая",
          author: "Гиллиан Флинн",
          coverImageUrl: "/images/books/ischeznuvshaya.webp",
          description:
            "Жена исчезает в годовщину свадьбы, муж становится главным подозреваемым.",
          defaultTierId: "tier_twist",
        },
        {
          title: "Убийство в Восточном экспрессе",
          author: "Агата Кристи",
          coverImageUrl: "/images/books/ubiystvo-v-vostochnom-ekspresse.webp",
          description: "Пуаро расследует убийство в застрявшем поезде.",
          defaultTierId: "tier_strong",
        },
        {
          title: "Десять негритят",
          author: "Агата Кристи",
          coverImageUrl: "/images/books/desyat-negrityat.webp",
          description:
            "Десять незнакомцев оказываются на острове и начинают умирать.",
          defaultTierId: "tier_strong",
        },
        {
          title: "Молчание ягнят",
          author: "Томас Харрис",
          coverImageUrl: "/images/books/molchanie-yagnyat.webp",
          description:
            "Агент ФБР консультируется с каннибалом для поимки маньяка.",
          defaultTierId: "tier_ok",
        },
        {
          title: "Шерлок Холмс. Этюд в багровых тонах",
          author: "Артур Конан Дойл",
          coverImageUrl: "/images/books/sherlok-kholms.webp",
          description: "Первое дело великого детектива и доктора Ватсона.",
          defaultTierId: "tier_ok",
        },
        {
          title: "Код да Винчи",
          author: "Дэн Браун",
          coverImageUrl: "/images/books/kod-da-vinchi.webp",
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
          coverImageUrl: "/images/books/schegol.webp",
          description:
            "Мальчик выживает после теракта в музее и хранит украденную картину.",
          defaultTierId: "tier_master",
        },
        {
          title: "Бегущий за ветром",
          author: "Халед Хоссейни",
          coverImageUrl: "/images/books/beguschiy-za-vetrom.webp",
          description: "Трогательная история дружбы в Афганистане.",
          defaultTierId: "tier_master",
        },
        {
          title: "Шантарам",
          author: "Грегори Дэвид Робертс",
          coverImageUrl: "/images/books/shantaram.webp",
          description: "Приключения беглого преступника в Бомбее.",
          defaultTierId: "tier_great",
        },
        {
          title: "Тень ветра",
          author: "Карлос Руис Сафон",
          coverImageUrl: "/images/books/ten-vetra.webp",
          description: "Мистический триллер в послевоенной Барселоне.",
          defaultTierId: "tier_great",
        },
        {
          title: "Жизнь Пи",
          author: "Ян Мартел",
          coverImageUrl: "/images/books/zhizn-pi.webp",
          description: "Мальчик выживает в шлюпке с бенгальским тигром.",
          defaultTierId: "tier_good",
        },
        {
          title: "Вино из одуванчиков",
          author: "Рэй Брэдбери",
          coverImageUrl: "/images/books/vino-iz-oduvanchikov.webp",
          description: "Ностальгическая история о лете детства.",
          defaultTierId: "tier_good",
        },
        {
          title: "Где ты?",
          author: "Марк Леви",
          coverImageUrl: "/images/books/gde-ty.webp",
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
          coverImageUrl: "/images/books/master-i-margarita.webp",
          description: "Мистический роман о дьяволе в Москве 1930-х годов.",
          defaultTierId: "tier_classic",
        },
        {
          title: "Тихий Дон",
          author: "Михаил Шолохов",
          coverImageUrl: "/images/books/tikhiy-don.webp",
          description: "Эпос о донском казачестве в годы революции.",
          defaultTierId: "tier_classic",
        },
        {
          title: "Доктор Живаго",
          author: "Борис Пастернак",
          coverImageUrl: "/images/books/doktor-zhivago.webp",
          description: "История поэта в годы революции и гражданской войны.",
          defaultTierId: "tier_classic",
        },
        {
          title: "Архипелаг ГУЛАГ",
          author: "Александр Солженицын",
          coverImageUrl: "/images/books/arkhipelag-gulag.webp",
          description: "Художественно-документальное исследование репрессий.",
          defaultTierId: "tier_modern",
        },
        {
          title: "Москва-Петушки",
          author: "Венедикт Ерофеев",
          coverImageUrl: "/images/books/moskva-petushki.webp",
          description: "Поэма о путешествии электричкой и смысле жизни.",
          defaultTierId: "tier_modern",
        },
        {
          title: "Generation П",
          author: "Виктор Пелевин",
          coverImageUrl: "/images/books/generation-p.webp",
          description: "Сатира о поколении 90-х и рекламе в новой России.",
          defaultTierId: "tier_new",
        },
        {
          title: "Лавр",
          author: "Евгений Водолазкин",
          coverImageUrl: "/images/books/lavr.webp",
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
          coverImageUrl: "/images/books/sapiens-kratkaya-istoriya-chelovechestva.webp",
          description:
            "От каменного века до наших дней: как Homo sapiens стал хозяином планеты.",
          defaultTierId: "tier_revolution",
        },
        {
          title: "Краткая история времени",
          author: "Стивен Хокинг",
          coverImageUrl: "/images/books/kratkaya-istoriya-vremeni.webp",
          description: "От Большого взрыва до чёрных дыр: просто о сложном.",
          defaultTierId: "tier_revolution",
        },
        {
          title: "Происхождение видов",
          author: "Чарльз Дарвин",
          coverImageUrl: "/images/books/proiskhozhdenie-vidov.webp",
          description:
            "Фундаментальный труд об эволюции и естественном отборе.",
          defaultTierId: "tier_fundamental",
        },
        {
          title: "Структура научных революций",
          author: "Томас Кун",
          coverImageUrl: "/images/books/struktura-nauchnykh-revolyutsiy.webp",
          description: "Философия науки и смена парадигм.",
          defaultTierId: "tier_fundamental",
        },
        {
          title: "Космос",
          author: "Карл Саган",
          coverImageUrl: "/images/books/kosmos.webp",
          description:
            "Путешествие по Вселенной с великим популяризатором науки.",
          defaultTierId: "tier_popular",
        },
        {
          title: "Сапиенс. Иллюстрированная история",
          author: "Юваль Ной Харари",
          coverImageUrl: "/images/books/sapiens-illyustrirovannaya-istoriya.webp",
          description:
            "Иллюстрированная версия бестселлера о истории человечества.",
          defaultTierId: "tier_popular",
        },
        {
          title: "Физика невозможного",
          author: "Митио Каку",
          coverImageUrl: "/images/books/fizika-nevozmozhnogo.webp",
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
          coverImageUrl: "/images/books/atomnye-privychki.webp",
          description:
            "Практическое руководство по формированию полезных привычек.",
          defaultTierId: "tier_must",
        },
        {
          title: "Думай медленно... решай быстро",
          author: "Даниэль Канеман",
          coverImageUrl: "/images/books/dumay-medlenno-reshay-bystro.webp",
          description: "Нобелевский лауреат о двух системах мышления.",
          defaultTierId: "tier_must",
        },
        {
          title: "Богатый папа, бедный папа",
          author: "Роберт Кийосаки",
          coverImageUrl: "/images/books/bogatyy-papa-bednyy-papa.webp",
          description: "Финансовая грамотность и мышление богатого человека.",
          defaultTierId: "tier_recommend",
        },
        {
          title: "7 навыков высокоэффективных людей",
          author: "Стивен Кови",
          coverImageUrl: "/images/books/7-navykov-vysokoeffektivnykh-lyudey.webp",
          description: "Принципы личной эффективности от классика self-help.",
          defaultTierId: "tier_recommend",
        },
        {
          title: "Как завоевывать друзей",
          author: "Дейл Карнеги",
          coverImageUrl: "/images/books/kak-zavoevyvat-druzey.webp",
          description: "Классика о влиянии на людей и построении отношений.",
          defaultTierId: "tier_recommend",
        },
        {
          title: "Сила воли",
          author: "Келли Макгонигал",
          coverImageUrl: "/images/books/sila-voli.webp",
          description: "Научный подход к развитию самоконтроля.",
          defaultTierId: "tier_once",
        },
        {
          title: "Магия утра",
          author: "Хэл Элрод",
          coverImageUrl: "/images/books/magiya-utra.webp",
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
          coverImageUrl: "/images/books/dyuna.webp",
          description:
            "Эпическая сага о пустынной планете Арракис и борьбе за меланж.",
          defaultTierId: "tier_masterpiece",
        },
        {
          title: "Основание",
          author: "Айзек Азимов",
          coverImageUrl: "/images/books/osnovanie.webp",
          description: "Грандиозная сага о падении Галактической Империи.",
          defaultTierId: "tier_masterpiece",
        },
        {
          title: "1984",
          author: "Джордж Оруэлл",
          coverImageUrl: "/images/books/1984.webp",
          description:
            "Антиутопия о тоталитарном обществе под контролем Большого Брата.",
          defaultTierId: "tier_great",
        },
        {
          title: "О дивный новый мир",
          author: "Олдос Хаксли",
          coverImageUrl: "/images/books/o-divnyy-novyy-mir.webp",
          description: "Антиутопия о мире, где люди выращиваются в пробирках.",
          defaultTierId: "tier_great",
        },
        {
          title: "Марсианин",
          author: "Энди Вейер",
          coverImageUrl: "/images/books/marsianin.webp",
          description: "Астронавт выживает на Марсе в одиночку.",
          defaultTierId: "tier_good",
        },
        {
          title: "Контакт",
          author: "Карл Саган",
          coverImageUrl: "/images/books/kontakt.webp",
          description: "Учёные получают сигнал от внеземной цивилизации.",
          defaultTierId: "tier_good",
        },
        {
          title: "Солярис",
          author: "Станислав Лем",
          coverImageUrl: "/images/books/solyaris.webp",
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
          coverImageUrl: "/images/books/neyromant.webp",
          description:
            "Хакер Кейс погружается в матрицу для выполнения опасного задания.",
          defaultTierId: "tier_classic",
        },
        {
          title: "Мечтают ли андроиды об электроовцах?",
          author: "Филип К. Дик",
          coverImageUrl: "/images/books/mechtayut-li-androidy-ob-elektroovtsakh.webp",
          description:
            "Охотник за головами преследует андроидов в постапокалиптическом мире.",
          defaultTierId: "tier_classic",
        },
        {
          title: "Лавина",
          author: "Нил Стивенсон",
          coverImageUrl: "/images/books/lavina.webp",
          description:
            "Курьер и хакер в мире, где корпорации заменили государства.",
          defaultTierId: "tier_modern",
        },
        {
          title: "Алита",
          author: "Юкито Кисиро",
          coverImageUrl: "/images/books/alita.webp",
          description: "Киборг-девочка ищет своё прошлое в мире свалки.",
          defaultTierId: "tier_modern",
        },
        {
          title: "Видоизменённый углерод",
          author: "Ричард К. Морган",
          coverImageUrl: "/images/books/vidoizmenennyy-uglerod.webp",
          description:
            "В мире, где сознание можно переносить, расследуют убийство.",
          defaultTierId: "tier_other",
        },
        {
          title: "Светлячок",
          author: "Джосс Уидон",
          coverImageUrl: "/images/books/svetlyachok.webp",
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
          coverImageUrl: "/images/books/giperion.webp",
          description:
            "Семь паломников отправляются к Гипериону в поисках ответов.",
          defaultTierId: "tier_epic",
        },
        {
          title: "Гимн Лейбовицу",
          author: "Уолтер М. Миллер",
          coverImageUrl: "/images/books/pesn-o-leybovitse.webp",
          description: "Монахи сохраняют знания после ядерного апокалипсиса.",
          defaultTierId: "tier_epic",
        },
        {
          title: "Звёздный десант",
          author: "Роберт Хайнлайн",
          coverImageUrl: "/images/books/zvezdnyy-desant.webp",
          description: "Военная фантастика о войне с насекомыми-арахнидами.",
          defaultTierId: "tier_good",
        },
        {
          title: "Вавилон-5",
          author: "Дж. Майкл Стражински",
          coverImageUrl: "/images/books/vavilon-5.webp",
          description: "Космическая станция как центр дипломатии и конфликтов.",
          defaultTierId: "tier_good",
        },
        {
          title: "Метро 2033",
          author: "Дмитрий Глуховский",
          coverImageUrl: "/images/books/metro-2033.webp",
          description: "Выживание в московском метро после ядерной войны.",
          defaultTierId: "tier_average",
        },
        {
          title: "Аннигиляция",
          author: "Джефф Вандермеер",
          coverImageUrl: "/images/books/annigilyatsiya.webp",
          description: "Экспедиция в Зону Икс, где природа мутирует.",
          defaultTierId: "tier_average",
        },
        {
          title: "Задача трёх тел",
          author: "Лю Цысинь",
          coverImageUrl: "/images/books/problema-trekh-tel.webp",
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
    slug: "nobel-laureates",
    title: "Лауреаты Нобелевской премии",
    type: "literary",
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
    coverImageUrl: "/images/collections/literary/nobel-prize.webp",
    bookCovers: [
      "/images/books/bunin-medium.webp",
      "/images/books/pasternak-medium.webp",
      "/images/books/sholohov-medium.webp",
    ],
    tags: ["Нобелевская премия", "Классика", "Лауреаты"],
    isFeatured: false,

    isPublished: true,
    order: 1,
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-03-20T14:30:00Z",
  },
  {
    id: 2,
    slug: "favorites-bookstrata",
    title: "Фавориты BookStrata",
    type: "literary",
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
    coverImageUrl: "/images/collections/literary/2026-hero.webp",
    bookCovers: [
      "/images/books/shantaram.webp",
      "/images/books/shadow-wind.webp",
      "/images/books/circus.webp",
    ],
    tags: ["Популярное", "Выбор читателей", "Топ"],
    isFeatured: false,

    isPublished: true,
    order: 2,
    createdAt: "2026-02-01T09:00:00Z",
    updatedAt: "2026-03-22T11:15:00Z",
  },
  {
    id: 3,
    slug: "historical-prose",
    title: "Историческая проза",
    type: "literary",
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
    coverImageUrl: "/images/collections/literary/prosa-hero.webp",
    bookCovers: [
      "/images/books/prosa-medium.webp",
      "/images/books/prosa1-medium.webp",
      "/images/books/prosa3-medium.webp",
    ],
    tags: ["Историческая проза", "Классика", "Современная литература"],
    isFeatured: false,

    isPublished: true,
    order: 3,
    createdAt: "2026-02-10T12:00:00Z",
    updatedAt: "2026-03-23T16:45:00Z",
  },
  // ===== Curated коллекции (тир-листы) =====
  {
    id: 4,
    slug: "top-fantasy",
    title: "Топ фэнтези",
    type: "curated",
    excerpt: "Лучшие книги в жанре фэнтези: от классики Толкина до современных бестселлеров.",
    coverImageUrl: "/images/collections/curated/top-fantasy/mistborn.jpeg",
    bookCovers: ["/images/collections/curated/top-fantasy/mistborn.jpeg", "/images/collections/curated/top-fantasy/astral-library.jpeg", "/images/collections/curated/top-fantasy/house-lasyr.jpeg"],
    tags: ["Фэнтези", "Эпическое фэнтези", "Магия", "Приключения"],
    isFeatured: false,

    isPublished: true,
    order: 10,
    createdAt: "2026-04-01T10:00:00Z",
    updatedAt: "2026-04-01T10:00:00Z",
    tiers: {
      s: { id: "s", title: "Шедевр", color: "#ef4444", bookIds: ["b1", "b2", "b3"] },
      a: { id: "a", title: "Отлично", color: "#f97316", bookIds: ["b4", "b5", "b6"] },
      b: { id: "b", title: "Хорошо", color: "#eab308", bookIds: ["b7", "b8", "b9"] },
      c: { id: "c", title: "Средне", color: "#84cc16", bookIds: ["b10", "b11"] },
    },
    tierOrder: ["s", "a", "b", "c"],
    books: {
      b1: { id: "b1", title: "Властелин Колец", author: "Дж. Р. Р. Толкин", coverImageUrl: "/images/collections/curated/top-fantasy/mistborn.jpeg", description: "Эпическое фэнтези о хоббите Фродо, несущем Кольцо Всевластия в Роковую гору." },
      b2: { id: "b2", title: "Гарри Поттер и философский камень", author: "Дж. К. Роулинг", coverImageUrl: "/images/collections/curated/top-fantasy/astral-library.jpeg", description: "Первая книга о мальчике-волшебнике и его приключениях в Хогвартсе." },
      b3: { id: "b3", title: "Игра престолов", author: "Джордж Р. Р. Мартин", coverImageUrl: "/images/collections/curated/top-fantasy/house-lasyr.jpeg", description: "Политические интриги и войны в вымышленном мире Вестероса." },
      b4: { id: "b4", title: "Хроники Нарнии", author: "К. С. Льюис", coverImageUrl: "/images/collections/curated/top-fantasy/onvisible-life.jpeg", description: "Дети попадают в волшебную страну через платяной шкаф." },
      b5: { id: "b5", title: "Имя ветра", author: "Патрик Ротфусс", coverImageUrl: "/images/collections/curated/top-fantasy/piranesi.jpeg", description: "История Квоута — мага, вора и музыканта." },
      b6: { id: "b6", title: "Ведьмак", author: "Анджей Сапковский", coverImageUrl: "/images/collections/curated/top-fantasy/circeya.jpeg", description: "Охотник на чудовищ в мире славянских легенд." },
      b7: { id: "b7", title: "Песнь Ахилла", author: "Мадлен Миллер", coverImageUrl: "/images/collections/curated/top-fantasy/song-achilles.jpg", description: "Переосмысление мифа об Ахилле и Патрокле." },
      b8: { id: "b8", title: "Сила немногих", author: "", coverImageUrl: "/images/collections/curated/top-fantasy/strength-few.jpeg", description: "" },
      b9: { id: "b9", title: "Катабасис", author: "", coverImageUrl: "/images/collections/curated/top-fantasy/katabasis.jpeg", description: "" },
      b10: { id: "b10", title: "Погребение", author: "", coverImageUrl: "/images/collections/curated/top-fantasy/bury.jpeg", description: "" },
      b11: { id: "b11", title: "COFE", author: "", coverImageUrl: "/images/collections/curated/top-fantasy/cofe.jpeg", description: "" },
    },
    unrankedBookIds: [],
  },
  {
    id: 5,
    slug: "top-detective",
    title: "Топ детективов и триллеров — рейтинг книг",
    type: "curated",
    excerpt: "Захватывающие детективы и триллеры, которые держат в напряжении до последней страницы.",
    coverImageUrl: "/images/collections/curated/top-detective/intruder.jpg",
    bookCovers: ["/images/collections/curated/top-detective/intruder.jpg", "/images/collections/curated/top-detective/alibi.jpeg", "/images/collections/curated/top-detective/his-her.jpeg"],
    tags: ["Детективы", "Триллеры", "Мистика", "Криминал", "Психология"],
    isFeatured: false,

    isPublished: true,
    order: 11,
    createdAt: "2026-04-02T10:00:00Z",
    updatedAt: "2026-04-02T10:00:00Z",
    tiers: {
      s: { id: "s", title: "Шедевр", color: "#ef4444", bookIds: ["d1", "d2", "d3"] },
      a: { id: "a", title: "Отлично", color: "#f97316", bookIds: ["d4", "d5", "d6"] },
      b: { id: "b", title: "Хорошо", color: "#eab308", bookIds: ["d7", "d8"] },
      c: { id: "c", title: "Средне", color: "#84cc16", bookIds: ["d9", "d10"] },
    },
    tierOrder: ["s", "a", "b", "c"],
    books: {
      d1: { id: "d1", title: "Вторженец", author: "", coverImageUrl: "/images/collections/curated/top-detective/intruder.jpg", description: "" },
      d2: { id: "d2", title: "Алиби", author: "", coverImageUrl: "/images/collections/curated/top-detective/alibi.jpeg", description: "" },
      d3: { id: "d3", title: "Его/Её", author: "", coverImageUrl: "/images/collections/curated/top-detective/his-her.jpeg", description: "" },
      d4: { id: "d4", title: "Тайна особняка", author: "", coverImageUrl: "/images/collections/curated/top-detective/secret-housemade.jpeg", description: "" },
      d5: { id: "d5", title: "Пациент", author: "", coverImageUrl: "/images/collections/curated/top-detective/pacient.jpeg", description: "" },
      d6: { id: "d6", title: "Не она", author: "", coverImageUrl: "/images/collections/curated/top-detective/not-her.jpeg", description: "" },
      d7: { id: "d7", title: "Бог лесов", author: "", coverImageUrl: "/images/collections/curated/top-detective/god-woods.jpg", description: "" },
      d8: { id: "d8", title: "Особняк", author: "", coverImageUrl: "/images/collections/curated/top-detective/hoysemade.jpeg", description: "" },
      d9: { id: "d9", title: "Дом №3", author: "", coverImageUrl: "/images/collections/curated/top-detective/housemade3.jpeg", description: "" },
      d10: { id: "d10", title: "Падшая", author: "", coverImageUrl: "/images/collections/curated/top-detective/woman-down.jpg", description: "" },
    },
    unrankedBookIds: [],
  },
  {
    id: 6,
    slug: "top-fantastic",
    title: "Топ книг фантастика — рейтинг",
    type: "curated",
    excerpt: "Классика и современность: лучшие научно-фантастические романы, расширяющие границы воображения.",
    coverImageUrl: "/images/collections/curated/top-fantastic/carl.jpeg",
    bookCovers: ["/images/collections/curated/top-fantastic/carl.jpeg", "/images/collections/curated/top-fantastic/dark-matter.jpeg", "/images/collections/curated/top-fantastic/gold-son.jpeg"],
    tags: ["Фантастика", "Sci-Fi", "Классика", "Киберпанк"],
    isFeatured: false,

    isPublished: true,
    order: 12,
    createdAt: "2026-04-03T10:00:00Z",
    updatedAt: "2026-04-03T10:00:00Z",
    tiers: {
      s: { id: "s", title: "Шедевр", color: "#ef4444", bookIds: ["sf1", "sf2", "sf3"] },
      a: { id: "a", title: "Отлично", color: "#f97316", bookIds: ["sf4", "sf5", "sf6"] },
      b: { id: "b", title: "Хорошо", color: "#eab308", bookIds: ["sf7", "sf8"] },
      c: { id: "c", title: "Средне", color: "#84cc16", bookIds: ["sf9", "sf10"] },
    },
    tierOrder: ["s", "a", "b", "c"],
    books: {
      sf1: { id: "sf1", title: "Карл", author: "", coverImageUrl: "/images/collections/curated/top-fantastic/carl.jpeg", description: "" },
      sf2: { id: "sf2", title: "Тёмная материя", author: "", coverImageUrl: "/images/collections/curated/top-fantastic/dark-matter.jpeg", description: "" },
      sf3: { id: "sf3", title: "Золотой сын", author: "", coverImageUrl: "/images/collections/curated/top-fantastic/gold-son.jpeg", description: "" },
      sf4: { id: "sf4", title: "Я, кто", author: "", coverImageUrl: "/images/collections/curated/top-fantastic/i-who.jpeg", description: "" },
      sf5: { id: "sf5", title: "Марсианин", author: "", coverImageUrl: "/images/collections/curated/top-fantastic/marsianin.jpeg", description: "" },
      sf6: { id: "sf6", title: "Министерство времени", author: "", coverImageUrl: "/images/collections/curated/top-fantastic/ministery-time.jpeg", description: "" },
      sf7: { id: "sf7", title: "Никогда", author: "", coverImageUrl: "/images/collections/curated/top-fantastic/never.jpg", description: "" },
      sf8: { id: "sf8", title: "Операция", author: "", coverImageUrl: "/images/collections/curated/top-fantastic/operation.jpeg", description: "" },
      sf9: { id: "sf9", title: "Красный", author: "", coverImageUrl: "/images/collections/curated/top-fantastic/red-pising.jpeg", description: "" },
      sf10: { id: "sf10", title: "Карл 2", author: "", coverImageUrl: "/images/collections/curated/top-fantastic/carl2.jpeg", description: "" },
    },
    unrankedBookIds: [],
  },
  {
    id: 7,
    slug: "non-fiction-top",
    title: "Лучший нон-фикшн",
    type: "curated",
    excerpt: "Книги, которые меняют жизнь: от привычек до истории человечества.",
    coverImageUrl: "/images/collections/curated/popular-science/atomic.jpeg",
    bookCovers: ["/images/collections/curated/popular-science/atomic.jpeg", "/images/collections/curated/popular-science/anthropocene.jpeg", "/images/collections/curated/popular-science/anxious.jpeg"],
    tags: ["Нон-фикшн", "Саморазвитие", "Наука", "История"],
    isFeatured: false,

    isPublished: true,
    order: 15,
    createdAt: "2026-04-06T10:00:00Z",
    updatedAt: "2026-04-06T10:00:00Z",
    tiers: {
      s: { id: "s", title: "Обязательно", color: "#ef4444", bookIds: ["n1", "n2", "n3"] },
      a: { id: "a", title: "Рекомендую", color: "#f97316", bookIds: ["n4", "n5", "n6"] },
      b: { id: "b", title: "Полезно", color: "#eab308", bookIds: ["n7", "n8"] },
      c: { id: "c", title: "Средне", color: "#84cc16", bookIds: ["n9", "n10", "n11", "n12"] },
    },
    tierOrder: ["s", "a", "b", "c"],
    books: {
      n1: { id: "n1", title: "Атомные привычки", author: "Джеймс Клир", coverImageUrl: "/images/collections/curated/popular-science/atomic.jpeg", description: "Практическое руководство по формированию полезных привычек." },
      n2: { id: "n2", title: "Антропоцен", author: "", coverImageUrl: "/images/collections/curated/popular-science/anthropocene.jpeg", description: "" },
      n3: { id: "n3", title: "Тревожные люди", author: "", coverImageUrl: "/images/collections/curated/popular-science/anxious.jpeg", description: "" },
      n4: { id: "n4", title: "Пусть они говорят", author: "", coverImageUrl: "/images/collections/curated/popular-science/let-them.jpeg", description: "" },
      n5: { id: "n5", title: "Лондонское падение", author: "", coverImageUrl: "/images/collections/curated/popular-science/london-falling.jpeg", description: "" },
      n6: { id: "n6", title: "Люди", author: "", coverImageUrl: "/images/collections/curated/popular-science/mans.jpeg", description: "" },
      n7: { id: "n7", title: "Музей воровства", author: "", coverImageUrl: "/images/collections/curated/popular-science/museum-vor.jpeg", description: "" },
      n8: { id: "n8", title: "Однажды", author: "", coverImageUrl: "/images/collections/curated/popular-science/one-day.jpg", description: "" },
      n9: { id: "n9", title: "Пофигизм", author: "", coverImageUrl: "/images/collections/curated/popular-science/pofigism.png", description: "" },
      n10: { id: "n10", title: "Психи и деньги", author: "", coverImageUrl: "/images/collections/curated/popular-science/psi-money.jpeg", description: "" },
      n11: { id: "n11", title: "Сервисия", author: "", coverImageUrl: "/images/collections/curated/popular-science/serviceberry.jpg", description: "" },
      n12: { id: "n12", title: "Туберкулёз", author: "", coverImageUrl: "/images/collections/curated/popular-science/tuberculosis.jpeg", description: "" },
    },
    unrankedBookIds: [],
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
