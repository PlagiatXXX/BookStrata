import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Sparkles } from "lucide-react";

const DONATE_URL = "https://www.donationalerts.com/";

const navLinks = [
  { href: "/", label: "Мои рейтинги" },
  { href: "/templates", label: "Шаблоны" },
  { href: "/community", label: "Сообщество" },
  { href: "/profile", label: "Профиль" },
];

export const Footer = () => {
  const [isDonateOpen, setIsDonateOpen] = useState(false);

  return (
    <footer className="relative mt-12 border-t border-white/10 bg-[radial-gradient(circle_at_10%_120%,rgba(249,115,22,0.2),transparent_45%),radial-gradient(circle_at_90%_0%,rgba(45,212,191,0.14),transparent_38%),#0b0f1f] px-6 py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-white/12 bg-black/25 p-5 backdrop-blur-[2px]">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">
              BookStrata Pro
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[#f3efe6]">
              Рейтинги книг без лишнего шума
            </h3>
            <p className="mt-2 text-sm text-[#b8b1a3]">
              Создавайте, делитесь и сравнивайте ваши tier-листы в одном месте.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-[#b8b1a3] transition-colors hover:text-[#f3efe6]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="relative flex items-start">
            <button
              type="button"
              onClick={() => setIsDonateOpen((prev) => !prev)}
              className="relative z-20 inline-flex w-fit items-center gap-2 rounded-xl border border-amber-200/45 bg-amber-200/10 px-3 py-2 text-sm font-semibold text-amber-50 transition-colors hover:bg-amber-200/15 cursor-pointer"
              aria-expanded={isDonateOpen}
            >
              <Sparkles size={16} className="text-amber-200" />
              Поддержка проекта
              <ChevronDown
                size={18}
                className={`text-amber-100 transition-transform duration-300 ${
                  isDonateOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            <div
              className={`absolute left-0 top-11 z-10 w-[min(92vw,360px)] origin-top-left overflow-hidden rounded-2xl border bg-[linear-gradient(140deg,rgba(251,191,36,0.16),rgba(249,115,22,0.09))] transition-transform opacity duration-500 ${
                isDonateOpen
                  ? "pointer-events-auto scale-100 border-amber-300/60 opacity-100 shadow-[0_12px_30px_rgba(249,115,22,0.2)]"
                  : "pointer-events-none scale-95 border-amber-300/35 opacity-0"
              }`}
            >
              <div
                className={`pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-amber-300/30 blur-2xl transition-transform opacity duration-500 ${
                  isDonateOpen ? "scale-150 opacity-80" : "scale-90 opacity-35"
                }`}
              />
              <div className="relative p-5">
                <h3 className="text-lg font-semibold text-white">
                  Поддержать донатом
                </h3>
                <p className="mt-2 text-sm text-amber-50/85">
                  Помогаете развивать платформу и ускорять новые функции.
                </p>
                <a
                  href={DONATE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center rounded-lg border border-amber-200/60 bg-amber-300/20 px-3 py-1.5 text-sm font-semibold text-amber-50 transition-colors hover:bg-amber-300/30"
                >
                  Перейти к донату
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-4 text-xs text-[#8f8a80] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} BookStrata Pro</p>
          <p>Спасибо, что развиваете проект вместе с нами.</p>
        </div>
      </div>
    </footer>
  );
};
