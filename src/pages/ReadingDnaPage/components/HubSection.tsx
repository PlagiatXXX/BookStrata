import { Link } from "react-router-dom";

export interface HubSectionProps {
  theme?: "dark" | "craft" | "light";
  className?: string;
}

const HUB_ITEMS = [
  {
    icon: "✍️",
    title: "Создать тир-лист в 1 клик",
    desc: "Быстрый старт",
    link: "/templates",
  },
  {
    icon: "🏆",
    title: "Книжные рейтинги",
    desc: "Топ года",
    link: "/rankings",
  },
  {
    icon: "🎭",
    title: "Что читают знаменитости",
    desc: "Полки кумиров",
    link: "/celebrities",
  },
  {
    icon: "📚",
    title: "Каталог авторов",
    desc: "От Остин до Пелевина",
    link: "/authors",
  },
  {
    icon: "📰",
    title: "Литературный блог",
    desc: "Новости и разборы",
    link: "/blog",
  },
  {
    icon: "❓",
    title: "Частые вопросы",
    desc: "FAQ",
    link: "/faq",
  },
];

export function HubSection({ theme = "dark", className = "" }: HubSectionProps) {
  const isDark = theme === "dark";

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {HUB_ITEMS.map((item, idx) => (
        <Link
          key={idx}
          to={item.link}
          className={`p-5 rounded-xl border transition-all duration-200 group block shadow-md hover:-translate-y-1 ${
            isDark
              ? "bg-[#2b1d14] border-[rgba(201,163,91,0.35)] text-[#efe3cc] hover:border-[#c9a35b]"
              : "bg-[#fffdf7] border-[rgba(59,110,168,0.35)] text-[#2e2a24] hover:border-[#3b6ea8]"
          }`}
        >
          <div className="text-2xl mb-2">{item.icon}</div>
          <h4
            className={`text-base sm:text-lg font-bold mb-1 leading-snug ${
              isDark
                ? "font-serif text-[#efe3cc]"
                : "font-['Caveat',cursive] text-xl sm:text-2xl text-[#2e2a24]"
            }`}
          >
            {item.title}
          </h4>
          <span className="text-xs opacity-65 block">{item.desc}</span>
        </Link>
      ))}
    </div>
  );
}
