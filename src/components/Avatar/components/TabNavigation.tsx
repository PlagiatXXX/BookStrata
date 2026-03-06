import { TABS } from '../constants';
import type { TabNavigationProps } from '../types';

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex gap-2 mb-6">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-primary text-white shadow-lg shadow-primary/25'
              : 'bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 text-gray-400 hover:text-white'
          }`}
        >
          <tab.icon size={16} />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
