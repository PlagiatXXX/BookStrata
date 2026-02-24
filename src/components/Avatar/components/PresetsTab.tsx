import { Check } from 'lucide-react';
import { presetCategories } from '../presets';

interface Preset {
  id: string;
  seed: string;
  thumbnail: string;
  full: string;
}

interface PresetsTabProps {
  activeCategory: keyof typeof presetCategories;
  previewUrl: string | null;
  onCategoryChange: (category: keyof typeof presetCategories) => void;
  onPresetSelect: (preset: Preset) => void;
}

export function PresetsTab({
  activeCategory,
  previewUrl,
  onCategoryChange,
  onPresetSelect,
}: PresetsTabProps) {
  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {Object.entries(presetCategories).map(([key, category]) => (
          <button
            key={key}
            onClick={() => onCategoryChange(key as keyof typeof presetCategories)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === key
                ? 'bg-primary text-white'
                : 'bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 text-gray-400 hover:text-white'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Preset Grid */}
      <div className="grid grid-cols-4 gap-3">
        {presetCategories[activeCategory].presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onPresetSelect(preset)}
            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-transform hover:scale-105 ${
              previewUrl === preset.full
                ? 'border-primary ring-2 ring-primary/50'
                : 'border-transparent hover:border-gray-400'
            }`}
          >
            <img
              src={preset.thumbnail}
              alt={preset.seed}
              className="w-full h-full object-cover"
            />
            {previewUrl === preset.full && (
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
