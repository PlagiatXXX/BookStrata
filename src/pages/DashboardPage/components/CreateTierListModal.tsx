import { useState, useContext } from "react";
import { RefreshCw, X, PlusCircle, Check } from "lucide-react";
import { motion } from "motion/react";
import { Modal } from "@/ui/Modal";
import { AuthContext } from "@/contexts/auth.context";
import { type TierListTheme, isAdminOnlyTheme } from "@/lib/tierListApi";
import type { CreateModalProps } from "../types";

type SeasonTab = "classic" | "autumn" | "winter";

interface TabItem {
  id: SeasonTab;
  label: string;
}

const SEASON_TABS: TabItem[] = [
  { id: "classic", label: "🏷️ Классика" },
  { id: "autumn", label: "🍂 Осень" },
  { id: "winter", label: "❄️ Зима" },
];

interface ThemeCardData {
  theme: TierListTheme;
  title: string;
  description: string;
  badge?: string;
  gradient: string;
  accentBorder: string;
  activeRing: string;
  badgeClass?: string;
}

const TAB_THEMES_DATA: Record<SeasonTab, ThemeCardData[]> = {
  classic: [
    {
      theme: "default",
      title: "Классический стиль BookStrata",
      description:
        "В редакторе будет доступен полный выбор из 12 стилей оформления и цветовых схем",
      gradient: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
      accentBorder: "border-[#c1fffe]",
      activeRing: "ring-2 ring-[#c1fffe]/40",
    },
  ],
  autumn: [
    {
      theme: "autumn-leaves",
      title: "Золотой листопад",
      description: "Кружащиеся кленовые листья и винтажный дуб",
      badge: "Сезонная",
      gradient: "linear-gradient(135deg, #1c120c 0%, #451a03 50%, #9a3412 100%)",
      accentBorder: "border-amber-500",
      activeRing: "ring-2 ring-amber-500/40",
      badgeClass: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    },
    {
      theme: "autumn-rain",
      title: "Осенний дождь",
      description: "Капли дождя на стекле и свет лампы",
      badge: "Сезонная",
      gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #d97706 100%)",
      accentBorder: "border-amber-400",
      activeRing: "ring-2 ring-amber-400/40",
      badgeClass: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    },
  ],
  winter: [
    {
      theme: "winter-frost",
      title: "Морозные узоры",
      description: "Заиндевевшее стекло с оттаиванием и снежные шапки",
      badge: "Сезонная",
      gradient: "linear-gradient(135deg, #0b1326 0%, #1e3a8a 50%, #38bdf8 100%)",
      accentBorder: "border-sky-400",
      activeRing: "ring-2 ring-sky-400/40",
      badgeClass: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
    },
    {
      theme: "winter-aurora",
      title: "Северное сияние",
      description: "Переливы авроры и искрящаяся метель",
      badge: "Сезонная",
      gradient: "linear-gradient(135deg, #06131c 0%, #0d9488 40%, #7c3aed 100%)",
      accentBorder: "border-teal-400",
      activeRing: "ring-2 ring-teal-400/40",
      badgeClass: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
    },
    {
      theme: "winter-newyear",
      title: "Новогодняя сказка",
      description: "Дед Мороз на лестнице, сани с оленями и гирлянда",
      badge: "🎄 Новый год",
      gradient: "linear-gradient(135deg, #052e16 0%, #15803d 40%, #b91c1c 80%, #fbbf24 100%)",
      accentBorder: "border-emerald-400",
      activeRing: "ring-2 ring-emerald-400/40",
      badgeClass: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    },
  ],
};

function getTabForTheme(theme: TierListTheme): SeasonTab {
  if (theme === "autumn-leaves" || theme === "autumn-rain") return "autumn";
  if (theme === "winter-frost" || theme === "winter-aurora" || theme === "winter-newyear") return "winter";
  return "classic";
}

export function CreateTierListModal({
  isOpen,
  onClose,
  onCreate,
  createTitle,
  onTitleChange,
  createDescription = "",
  onDescriptionChange,
  isPending,
  defaultTheme = "default",
  isAdmin: isAdminProp,
}: CreateModalProps) {
  const authContext = useContext(AuthContext);
  const isAdmin = isAdminProp !== undefined ? isAdminProp : authContext?.user?.role === "admin";
  const [showError, setShowError] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<TierListTheme>(defaultTheme);
  const [activeTab, setActiveTab] = useState<SeasonTab>(() =>
    getTabForTheme(defaultTheme),
  );

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevDefaultTheme, setPrevDefaultTheme] = useState(defaultTheme);

  if (prevIsOpen !== isOpen || prevDefaultTheme !== defaultTheme) {
    setPrevIsOpen(isOpen);
    setPrevDefaultTheme(defaultTheme);
    if (isOpen) {
      const initialTheme = !isAdmin && isAdminOnlyTheme(defaultTheme) ? "autumn-rain" : defaultTheme;
      setSelectedTheme(initialTheme);
      setActiveTab(getTabForTheme(initialTheme));
    }
  }

  const trimmedTitle = createTitle.trim();
  const isCreateDisabled = isPending;

  const handleTabChange = (tab: SeasonTab) => {
    setActiveTab(tab);
    const availableThemes = TAB_THEMES_DATA[tab]
      .map((c) => c.theme)
      .filter((t) => isAdmin || !isAdminOnlyTheme(t));
    if (!availableThemes.includes(selectedTheme)) {
      setSelectedTheme(availableThemes[0] ?? "default");
    }
  };

  const handleCreate = () => {
    if (!trimmedTitle) {
      setShowError(true);
      setTimeout(() => setShowError(false), 500);
      return;
    }
    onCreate(createTitle, createDescription, selectedTheme);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isCreateDisabled) {
      e.preventDefault();
      handleCreate();
    }
  };

  const isSeasonal = selectedTheme !== "default";

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId="create-modal-title" maxWidth="xl">
      <div className="dashboard-modal">
        <button
          onClick={onClose}
          className="dashboard-modal__close"
          type="button"
          aria-label="Закрыть"
          disabled={isPending}
        >
          <X size={16} />
        </button>

        <div>
          <h2 id="create-modal-title">Создать новый тир-лист</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <motion.div
            className="flex flex-col gap-1.5"
            animate={showError ? { x: [-4, 4, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <label htmlFor="create-tierlist-title" className="text-sm font-medium text-gray-300">
                Название
              </label>
              <span className="text-xs text-gray-500">
                {createTitle.length}/50
              </span>
            </div>

            <input
              id="create-tierlist-title"
              type="text"
              value={createTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Название тир-листа..."
              className={`dashboard-modal__input transition-colors placeholder:text-gray-400 placeholder:opacity-60 ${showError ? "border-red-500! ring-2 ring-red-500/20" : ""}`}
              maxLength={50}
              disabled={isPending}
              aria-label="Название тир-листа"
            />
          </motion.div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="create-tierlist-description" className="text-sm font-medium text-gray-300">
                Описание <span className="text-gray-500 font-normal text-xs">(не обязательно)</span>
              </label>
              <span className="text-xs text-gray-500">
                {createDescription.length}/200
              </span>
            </div>
            <textarea
              id="create-tierlist-description"
              value={createDescription}
              onChange={(e) => onDescriptionChange?.(e.target.value)}
              placeholder="О чём этот тир-лист…"
              maxLength={200}
              rows={1}
              disabled={isPending}
              className="dashboard-modal__input transition-colors resize-none placeholder:text-gray-400 placeholder:opacity-60 min-h-[42px] py-2.5"
              aria-label="Описание тир-листа"
            />
          </div>
        </div>

        {/* Выбор сезонной темы */}
        <div className="flex flex-col gap-2">
          <span id="theme-group-label" className="text-sm font-medium text-gray-300">
            Тема оформления
          </span>

          {/* Табы */}
          <div
            className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10"
            role="tablist"
            aria-label="Сезонные темы"
          >
            {SEASON_TABS.map((tab) => {
              const isTabActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`theme-tab-${tab.id}`}
                  aria-selected={isTabActive}
                  aria-controls="theme-tabpanel"
                  onClick={() => handleTabChange(tab.id)}
                  disabled={isPending}
                  className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all cursor-pointer text-center ${
                    isTabActive
                      ? "bg-white/15 text-white shadow-xs font-semibold"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Карточки текущего таба */}
          <div
            role="tabpanel"
            id="theme-tabpanel"
            aria-labelledby={`theme-tab-${activeTab}`}
          >
            <div
              role="radiogroup"
              aria-labelledby="theme-group-label"
              className={`grid gap-2.5 ${activeTab === "classic" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}
            >
            {TAB_THEMES_DATA[activeTab].map((card) => {
              const isLocked = !isAdmin && isAdminOnlyTheme(card.theme);
              const isSelected = selectedTheme === card.theme;
              return (
                <button
                  key={card.theme}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-disabled={isLocked}
                  onClick={() => !isLocked && setSelectedTheme(card.theme)}
                  disabled={isPending || isLocked}
                  title={isLocked ? `${card.title} (в разработке — только для администраторов)` : card.title}
                  className={`text-left relative flex flex-col justify-between p-3 rounded-xl border transition-all overflow-hidden ${
                    isLocked
                      ? "opacity-45 cursor-not-allowed border-white/5 bg-white/5 hover:border-white/5 hover:bg-white/5"
                      : isSelected
                        ? `${card.accentBorder} ${card.activeRing} bg-white/10 cursor-pointer`
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07] cursor-pointer"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div
                        className="h-4 w-12 rounded border border-white/20 shadow-xs"
                        style={{ background: card.gradient }}
                      />
                      <div className="flex items-center gap-1.5">
                        {isLocked ? (
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            🔒 В разработке
                          </span>
                        ) : card.badge ? (
                          <span
                            className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${card.badgeClass}`}
                          >
                            {card.badge}
                          </span>
                        ) : null}
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${
                            isLocked
                              ? "border-transparent bg-transparent text-amber-400 text-xs"
                              : isSelected
                                ? `${card.accentBorder} bg-white/20`
                                : "border-gray-500 bg-transparent"
                          }`}
                        >
                          {isLocked ? "🔒" : isSelected ? <Check size={10} className="text-white stroke-[3]" /> : null}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-white mb-1 leading-snug flex items-center gap-1.5">
                      {card.title}
                      {isLocked && <span className="text-xs text-amber-400">🔒</span>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed m-0!">
                    {isLocked ? "Тема временно на доработке и доступна только администраторам." : card.description}
                  </p>
                </button>
              );
            })}
            </div>
          </div>
        </div>

        <div className="dashboard-modal__actions">
          <button
            onClick={onClose}
            className="dashboard-btn dashboard-btn--ghost"
            type="button"
            disabled={isPending}
          >
            Отмена
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreateDisabled}
            className="dashboard-btn dashboard-btn--primary"
            type="button"
          >
            {isPending ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
                Создание...
              </>
            ) : (
              <>
                <PlusCircle size={16} />
                {isSeasonal ? "Создать с темой" : "Создать"}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
