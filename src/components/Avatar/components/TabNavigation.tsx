import { TABS } from "../constants";
import type { TabNavigationProps } from "../types";

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const currentIndex = TABS.findIndex((tab) => tab.id === activeTab);
    let nextIndex = -1;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = TABS.length - 1;
    }

    if (nextIndex !== -1) {
      event.preventDefault();
      onTabChange(TABS[nextIndex].id);
      setTimeout(() => {
        document.getElementById(`tab-${TABS[nextIndex].id}`)?.focus();
      }, 0);
    }
  };

  return (
    <div
      className="flex gap-2 mb-6"
      role="tablist"
      aria-label="Параметры аватара"
      onKeyDown={handleKeyDown}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          tabIndex={activeTab === tab.id ? 0 : -1}
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          id={`tab-${tab.id}`}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === tab.id
              ? "bg-primary text-white shadow-lg shadow-primary/25"
              : "bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 text-gray-400 hover:text-white"
          }`}
        >
          <tab.icon size={16} />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
