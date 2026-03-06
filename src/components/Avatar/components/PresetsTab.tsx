import { Check } from 'lucide-react';
import { presetCategories, getInitials, type AvatarPreset } from '../presets';
import type { PresetsTabProps } from '../types';

export function PresetsTab({
  activeCategory,
  onCategoryChange,
  onPresetSelect,
  selectedPresetUrl,
}: PresetsTabProps) {
  return (
    <div className="space-y-4">
      {/* Категории */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {Object.entries(presetCategories).map(([key, category]) => (
          <button
            key={key}
            onClick={() => onCategoryChange(key as PresetsTabProps['activeCategory'])}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === key
                ? 'bg-primary text-white'
                : 'bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 text-gray-400 hover:text-white'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Сетка пресетов */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {presetCategories[activeCategory].presets.map((preset: AvatarPreset) => (
          <button
            key={preset.id}
            onClick={() => onPresetSelect(preset)}
            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
              selectedPresetUrl === preset.full
                ? 'border-primary ring-2 ring-primary/50'
                : 'border-transparent hover:border-gray-400'
            }`}
          >
            <PresetImage preset={preset} />
            {selectedPresetUrl === preset.full && (
              <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                <Check size={20} className="text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

interface PresetImageProps {
  preset: {
    id: string;
    name: string;
    full: string;
  };
}

function PresetImage({ preset }: PresetImageProps) {
  return (
    <img
      src={preset.full}
      alt={preset.name}
      className="w-full h-full object-cover"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const parent = target.parentElement;
        if (parent && !parent.querySelector('.avatar-fallback')) {
          parent.classList.add(
            'flex',
            'items-center',
            'justify-center',
            'bg-surface-light',
            'dark:bg-[#2d2d44]',
          );
          const fallback = document.createElement('span');
          fallback.className = 'avatar-fallback text-xs font-bold text-gray-400';
          fallback.textContent = getInitials(preset.name);
          parent.appendChild(fallback);
        }
      }}
    />
  );
}
