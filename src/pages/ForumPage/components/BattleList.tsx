import { useEffect, useState, memo } from "react";
import { Sword, Loader2, AlertCircle } from "lucide-react";
import { getActiveBattles } from "@/lib/battlesApi";
import { type Battle } from "@/types/battles";
import { BattleCard } from "./BattleCard";

export const BattleList = memo(() => {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBattles = async () => {
      try {
        setIsLoading(true);
        const data = await getActiveBattles();
        setBattles(data);
      } catch (err) {
        console.error("Failed to fetch battles:", err);
        setError("Не удалось загрузить битвы. Попробуйте позже.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBattles();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <Loader2 className="w-10 h-10 text-(--accent-main) animate-spin mb-4" />
        <p className="text-(--ink-1) font-medium uppercase tracking-widest text-xs">
          Загрузка битв...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="brutal-card brutal-border p-12 text-center bg-red-500/5 reveal" data-reveal>
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-(--ink-0) font-bold mb-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs font-bold uppercase tracking-widest border-b border-red-500/30 hover:border-red-500"
        >
          Обновить страницу
        </button>
      </div>
    );
  }

  return (
    <section className="reveal" data-reveal>
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-(--accent-main) rounded-sm flex items-center justify-center brutal-shadow-sm">
              <Sword size={22} className="text-(--bg-0)" />
            </div>
            <h2 className="community-heading text-3xl md:text-4xl font-black leading-tight">
              Битвы шаблонов
            </h2>
          </div>
          <p className="text-(--ink-1) text-sm font-medium uppercase tracking-wider">
            Голосуйте за лучшие тир-листы сообщества
          </p>
        </div>
        <button className="hidden md:block text-(--ink-0) text-[10px] font-bold uppercase tracking-[0.2em] border-b-2 border-(--line-soft) hover:border-(--accent-main) transition-colors pb-1">
          Все битвы
        </button>
      </div>

      <div className="community-rule mb-10" />

      {battles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {battles.map((battle) => (
            <BattleCard key={battle.id} battle={battle} />
          ))}
        </div>
      ) : (
        <div className="brutal-card brutal-border p-16 text-center reveal" data-reveal>
          <div className="w-16 h-16 bg-(--bg-2) rounded-full flex items-center justify-center mx-auto mb-6 opacity-50">
            <Sword size={32} className="text-(--ink-1)" />
          </div>
          <h3 className="text-xl font-bold mb-2">Активных битв пока нет</h3>
          <p className="text-(--ink-1) text-sm max-w-sm mx-auto">
            Скоро здесь появятся новые испытания. Следите за обновлениями в новостях!
          </p>
        </div>
      )}
    </section>
  );
});
