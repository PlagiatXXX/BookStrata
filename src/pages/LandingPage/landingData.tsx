import { BookOpen, Layers, Heart, Sparkles, Sword, MessageSquare, BarChart3 } from "lucide-react";

/* ---------- Scenario card ---------- */
export interface ScenarioItem {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  points: string[];
  gradient: string;
  featured?: boolean;
}

export const scenarios: ScenarioItem[] = [
  {
    icon: BookOpen,
    title: "Ведите свою библиотеку",
    points: [
      "Добавляйте книги из Google Books и LiveLib",
      "Отмечайте статус: прочитано / читаю / планирую",
      "Никогда не забывайте, что читали",
    ],
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    icon: Layers,
    title: "Создавайте личные рейтинги",
    points: [
      "Распределяйте книги по уровням S, A, B, C, D",
      "Кастомизируйте темы, обложки и блоки",
      "Делитесь визуальными подборками с друзьями",
    ],
    gradient: "from-violet-600 to-purple-600",
    featured: true,
  },
  {
    icon: Heart,
    title: "Находите единомышленников",
    points: [
      "Сравнивайте свои рейтинги с другими читателями",
      "Подписывайтесь на людей с похожим вкусом",
      "Обсуждайте книги в комментариях",
    ],
    gradient: "from-rose-500 to-pink-600",
  },
  {
    icon: Sparkles,
    title: "Открывайте новые книги",
    points: [
      "ИИ анализирует ваши вкусы и предлагает новинки",
      "Подборки на основе реальных читательских предпочтений",
      "Попадайте в книги, которые точно зайдут",
    ],
    gradient: "from-sky-500 to-indigo-600",
  },
];

/* ---------- Pricing ---------- */
export const allFeatures = [
  "Безлимитные тир-листы",
  "Безлимит книг в тир-листе",
  "Все темы оформления",
  "Баттлы и обсуждения",
  "Кастомные обложки",
  "Экспорт PNG",
  "Букстраж (AI-рекомендации)",
  "Добавление книг через Google Books и LiveLib",
  "AI-генерация аватарок",
  "И многое другое",
];

export interface Plan {
  name: string;
  price?: string;
  period?: string;
  desc?: string;
  features: string[];
  cta: string;
  donate: boolean;
}

export const plans: Plan[] = [
  {
    name: "Всё бесплатно",
    features: allFeatures,
    cta: "Начать бесплатно",
    donate: false,
  },
  {
    name: "Донат",
    price: "Любая",
    period: "сумма",
    desc: "Поддержите развитие проекта",
    features: [
      "+100 к карме",
      "Бейдж мецената",
      "Имя в списке спонсоров",
      "Ранний доступ к фичам",
    ],
    cta: "Поддержать",
    donate: true,
  },
];

/* ---------- Hero rotating phrases ---------- */
export const heroPhrases = [
  "рейтингов книг",
  "тир-листов",
  "личных подборок",
];

/* ---------- Target audience ---------- */
export interface AudienceItem {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  desc: string;
}

export const audienceItems: AudienceItem[] = [
  {
    icon: BookOpen,
    title: "Читаете от 5 книг в год",
    desc: "Чтобы не забывать прочитанное, вести список «что дальше» и находить новые книги по своим интересам.",
  },
  {
    icon: Heart,
    title: "Любите делиться и сравнивать",
    desc: "Чтобы показывать друзьям свой топ книг, участвовать в обсуждениях и находить людей со схожим вкусом.",
  },
  {
    icon: Sparkles,
    title: "Устали от случайных рекомендаций",
    desc: "Чтобы получать подборки книг, которые действительно подходят под ваш вкус, а не общие списки бестселлеров.",
  },
];

/* ---------- Screenshots data ---------- */
export interface ScreenshotItem {
  title: string;
  description: string;
  gradient: string;
  icon: React.ReactNode;
  src?: string;
  videoSrc?: string;
}

export const screenshots: ScreenshotItem[] = [
  {
    title: "Главная",
    description: "Лента тир-листов и подборок",
    gradient: "bg-linear-to-br from-violet-900/80 to-purple-900/80",
    icon: <BookOpen size={28} />,
    src: "/screenshots/dashboard.webp",
  },
  {
    title: "Редактор",
    description: "Drag-and-drop тир-листа",
    gradient: "bg-linear-to-br from-slate-800 to-slate-900/90",
    icon: <Layers size={28} />,
    videoSrc: "/screenshots/tier-list.mp4",
  },
  {
    title: "Баттлы",
    description: "Сравнение подборок",
    gradient: "bg-linear-to-br from-rose-900/80 to-orange-900/80",
    icon: <Sword size={28} />,
    src: "/screenshots/battles.webp",
  },
  {
    title: "Профиль",
    description: "Статистика и достижения",
    gradient: "bg-linear-to-br from-amber-900/80 to-orange-900/80",
    icon: <BarChart3 size={28} />,
    src: "/screenshots/profile.webp",
  },
  {
    title: "Личная библиотека",
    description: "Поиск и подборки",
    gradient: "bg-linear-to-br from-emerald-900/80 to-teal-900/80",
    icon: <MessageSquare size={28} />,
    src: "/screenshots/library.webp",
  },
  {
    title: "ИИ-рекомендации",
    description: "Умный подбор книг",
    gradient: "bg-linear-to-br from-sky-900/80 to-indigo-900/80",
    icon: <Sparkles size={28} />,
    src: "/screenshots/AI.webp",
  },
];
