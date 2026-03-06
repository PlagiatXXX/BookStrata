import type { LucideIcon } from 'lucide-react';
import type { PresetStyle, AvatarPreset } from './presets';

export type { PresetStyle, AvatarPreset };

// === Tab types ===
export type TabId = 'presets' | 'ai' | 'upload';

export interface TabConfig {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

// === Preview state ===
export type PreviewLoadState = 'idle' | 'loading' | 'ready' | 'error';

export interface PreviewState {
  url: string | null;
  loadState: PreviewLoadState;
}

export type PreviewAction =
  | { type: 'SET_PREVIEW'; url: string | null; loadState?: PreviewLoadState }
  | { type: 'SET_LOAD_STATE'; loadState: PreviewLoadState };

// === Generation state ===
export interface GenerationState {
  isGenerating: boolean;
  isWaitingForResult: boolean;
  generationBaseAvatar: string | null;
  error: string | null;
}

export type GenerationAction =
  | { type: 'START_GENERATION'; baseAvatar: string | null }
  | { type: 'GENERATION_SUCCESS'; imageUrl: string; remaining?: number }
  | { type: 'GENERATION_ERROR'; error: string }
  | { type: 'GENERATION_COMPLETE' }
  | { type: 'TIMEOUT'; error: string }
  | { type: 'CLEAR_ERROR' };

// === Limit info ===
export interface LimitInfo {
  used: number;
  limit: number;
  remaining: number;
}

// === Component props ===
export interface AvatarSelectorProps {
  currentAvatar?: string | null;
  username?: string;
  onSave: (avatarUrl: string) => Promise<void>;
  onClose: () => void;
}

export interface AvatarSelectorHeaderProps {
  onClose: () => void;
}

export interface AvatarPreviewProps {
  currentUrl: string | null | undefined;
  username?: string;
  hasSelection: boolean;
  isBusy: boolean;
}

export interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export interface PresetsTabProps {
  activeCategory: PresetStyle;
  onCategoryChange: (category: PresetStyle) => void;
  onPresetSelect: (preset: AvatarPreset) => void;
  selectedPresetUrl: string | null;
}

export interface AiGenerationTabProps {
  aiPrompt: string;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  isBusy: boolean;
  isGenerating: boolean;
  isWaitingForResult: boolean;
  error: string | null;
  previewLoadState: PreviewLoadState;
  remainingGenerations: number;
  limitInfo: LimitInfo | null;
}

export interface UploadTabProps {
  onFileSelect: (base64: string) => void;
  previewLoadState: PreviewLoadState;
}

export interface AvatarSelectorFooterProps {
  hasSelection: boolean;
  isSaving: boolean;
  isBusy: boolean;
  onSave: () => void;
  onClose: () => void;
}
