import { useEffect, memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, LayoutGrid, MessageSquare } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { BattleList } from "./components/BattleList";
import "./ForumPage.css";

const MemoizedBattleList = memo(BattleList);

export default function ForumPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal--visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleMyRatingsClick = useCallback(() => navigate("/"), [navigate]);

  return (
    <DashboardLayout
      onMyRatingsClick={handleMyRatingsClick}
      showTemplatesNav={true}
      showSearch={false}
      activeItem="Сообщество"
    >
      <div className="forum-shell min-h-screen">
        <main className="max-w-7xl mx-auto px-6 py-14 pb-20 cursor-default text-(--ink-0)">
          {/* Forum Header / Hero */}
          <section className="mb-16 reveal" data-reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-(--accent-main)">
                  <Users size={14} />
                  BookStrata Community
                </div>
                <h1 className="community-heading text-4xl md:text-6xl lg:text-7xl font-black leading-[0.9] tracking-tighter mb-6 uppercase italic">
                  Центр <span className="text-(--accent-main)">активностей</span>
                </h1>
                <p className="text-(--ink-1) max-w-xl text-base md:text-lg leading-relaxed font-medium">
                  Здесь кипит жизнь: участвуйте в битвах шаблонов, обсуждайте рейтинги
                  и находите единомышленников.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="forum-stat-card brutal-card brutal-border p-4 min-w-[120px]">
                  <div className="text-2xl font-black mb-1">2.4k</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-(--ink-1)">Участников</div>
                </div>
                <div className="forum-stat-card brutal-card brutal-border p-4 min-w-[120px]">
                  <div className="text-2xl font-black mb-1">15</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-(--ink-1)">Активных битв</div>
                </div>
              </div>
            </div>
          </section>

          {/* Activity Tabs / Sections */}
          <div className="flex items-center gap-6 mb-12 border-b border-(--line-soft) reveal" data-reveal>
             <button className="forum-tab active flex items-center gap-2 py-4 px-2 text-xs font-bold uppercase tracking-widest border-b-4 border-(--accent-main) text-(--ink-0)">
               <LayoutGrid size={16} />
               Битвы
             </button>
             <button className="forum-tab flex items-center gap-2 py-4 px-2 text-xs font-bold uppercase tracking-widest border-b-4 border-transparent text-(--ink-1) hover:text-(--ink-0) transition-colors cursor-not-allowed opacity-50">
               <MessageSquare size={16} />
               Обсуждения
               <span className="text-[8px] bg-(--bg-2) px-1.5 py-0.5 rounded ml-1">Скоро</span>
             </button>
          </div>

          <MemoizedBattleList />

          {/* Bottom Call to Action */}
          <section className="mt-24 reveal" data-reveal>
            <div className="brutal-card brutal-border bg-(--ink-0) text-(--bg-0) p-10 md:p-16 relative overflow-hidden">
               <div className="relative z-10 max-w-2xl">
                 <h2 className="community-heading text-3xl md:text-5xl font-black mb-6 leading-tight uppercase">
                   Хотите запустить <br/> свою битву?
                 </h2>
                 <p className="text-white/70 mb-8 text-sm md:text-base font-medium leading-relaxed">
                   Станьте куратором сообщества и организуйте соревнование по своему любимому шаблону.
                   Лучшие битвы получают охваты и уникальные награды.
                 </p>
                 <button className="brutal-cta bg-(--bg-0) text-(--ink-0) px-10 py-4 font-bold uppercase tracking-widest text-xs hover:bg-(--accent-main)">
                   Подать заявку
                 </button>
               </div>

               <div className="absolute top-1/2 right-[-5%] -translate-y-1/2 opacity-10 pointer-events-none hidden lg:block">
                 <Users size={400} />
               </div>
            </div>
          </section>
        </main>
      </div>
    </DashboardLayout>
  );
}
