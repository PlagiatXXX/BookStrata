import { useState, useReducer, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/authApi';
import { AvatarSelectorHeader } from './components/AvatarSelectorHeader';
import { AvatarPreview } from './components/AvatarPreview';
import { TabNavigation } from './components/TabNavigation';
import { PresetsTab } from './components/PresetsTab';
import { AiGenerationTab } from './components/AiGenerationTab';
import { UploadTab } from './components/UploadTab';
import { AvatarSelectorFooter } from './components/AvatarSelectorFooter';
import { useAvatarPreview } from './hooks/useAvatarPreview';
import { useAvatarGeneration } from './hooks/useAvatarGeneration';
import { allPresets } from './presets';
import type { AvatarSelectorProps, LimitInfo, PresetStyle, TabId } from './types';
import { QUERY_STALE_TIME_MS, QUERY_GC_TIME_MS } from './constants';
import { generationReducer } from './generationReducer';

export function AvatarSelector({
  currentAvatar,
  username,
  onSave,
  onClose,
}: AvatarSelectorProps) {
  const queryClient = useQueryClient();

  // Простые состояния через useState
  const [activeTab, setActiveTab] = useState<TabId>('presets');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<PresetStyle>('cartoon');

  // Сложные состояния через useReducer + хуки
  const {
    preview,
    setPreviewUrl,
    setLoadState,
  } = useAvatarPreview();

  // Для совместимости с legacy кодом используем reducer напрямую
  const [generation, dispatchGeneration] = useReducer(generationReducer, {
    isGenerating: false,
    isWaitingForResult: false,
    generationBaseAvatar: null,
    error: null,
  });

  // Хук генерации с кастомной логикой
  const { startGeneration, completeGeneration, clearError, handleError } =
    useAvatarGeneration({
      currentAvatar,
      onGenerationComplete: () => {
        dispatchGeneration({ type: 'GENERATION_COMPLETE' });
        setPreviewUrl(currentAvatar ?? null);
        setLoadState('ready');
      },
    });

  // Вычисляемые значения
  const currentUrl =
    preview.loadState === 'ready' && preview.url ? preview.url : currentAvatar;
  const hasSelection = preview.url !== null && preview.loadState === 'ready';
  const isBusy =
    generation.isGenerating ||
    generation.isWaitingForResult ||
    preview.loadState === 'loading';

  // Загружаем информацию о лимитах через useQuery
  const { data: limitData } = useQuery({
    queryKey: ['avatarLimit'],
    queryFn: fetchAvatarLimit,
    enabled: activeTab === 'ai',
    staleTime: QUERY_STALE_TIME_MS,
    gcTime: QUERY_GC_TIME_MS,
  });

  const limitInfo = limitData ?? null;
  const remainingGenerations = limitInfo?.remaining ?? 0;

  // Проверка: если аватар обновился во время ожидания генерации (legacy)
  useEffect(() => {
    if (!generation.isWaitingForResult) return;
    if (currentAvatar && currentAvatar !== generation.generationBaseAvatar) {
      completeGeneration();
      setPreviewUrl(currentAvatar ?? null);
      setLoadState('ready');
    }
  }, [
    currentAvatar,
    generation.isWaitingForResult,
    generation.generationBaseAvatar,
    completeGeneration,
    setPreviewUrl,
    setLoadState,
  ]);

  // Обработчики
  const handlePresetSelect = (preset: (typeof allPresets)[0]) => {
    setPreviewUrl(preset.full);
    setLoadState('ready');
    clearError();
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;

    startGeneration(currentAvatar ?? null);

    try {
      const token = getAuthToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/avatars/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ prompt: aiPrompt.trim() }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          handleError(data.error || 'Дневной лимит исчерпан');
          queryClient.setQueryData(['avatarLimit'], (prev: LimitInfo | null) =>
            prev ? { ...prev, remaining: 0 } : null,
          );
        } else {
          handleError(data.error || 'Ошибка генерации');
        }
        return;
      }

      if (data.imageUrl) {
        setPreviewUrl(data.imageUrl);
        setLoadState('loading');
        dispatchGeneration({
          type: 'GENERATION_SUCCESS',
          imageUrl: data.imageUrl,
          remaining: data.remaining,
        });
        if (data.remaining !== undefined) {
          queryClient.setQueryData(['avatarLimit'], (prev: LimitInfo | null) =>
            prev ? { ...prev, remaining: data.remaining } : null,
          );
        }
      }
    } catch {
      handleError('Ошибка соединения. Попробуйте ещё раз.');
    }
  };

  const handleSave = async () => {
    if (!currentUrl) return;

    setIsSaving(true);
    try {
      await onSave(currentUrl);
      onClose();
    } catch (error) {
      console.error('Failed to save avatar:', error);
      alert('Ошибка при сохранении. Попробуйте ещё раз.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = (base64: string) => {
    setPreviewUrl(base64);
    setLoadState('loading');
    clearError();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#1a1a2e] dark:bg-[#1a1a2e] light:bg-white p-6 shadow-2xl animate-scale-in">
        {/* Header */}
        <AvatarSelectorHeader onClose={onClose} />

        {/* Preview */}
        <AvatarPreview
          currentUrl={currentUrl}
          username={username}
          hasSelection={hasSelection}
          isBusy={isBusy}
        />

        {/* Tabs */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="min-h-75">
          {activeTab === 'presets' && (
            <PresetsTab
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              onPresetSelect={handlePresetSelect}
              selectedPresetUrl={preview.url}
            />
          )}

          {activeTab === 'ai' && (
            <AiGenerationTab
              aiPrompt={aiPrompt}
              onPromptChange={setAiPrompt}
              onGenerate={handleAiGenerate}
              isBusy={isBusy}
              isGenerating={generation.isGenerating}
              isWaitingForResult={generation.isWaitingForResult}
              error={generation.error}
              previewLoadState={preview.loadState}
              remainingGenerations={remainingGenerations}
              limitInfo={limitInfo}
            />
          )}

          {activeTab === 'upload' && (
            <UploadTab
              onFileSelect={handleFileSelect}
              previewLoadState={preview.loadState}
            />
          )}
        </div>

        {/* Footer Actions */}
        <AvatarSelectorFooter
          hasSelection={hasSelection}
          isSaving={isSaving}
          isBusy={isBusy}
          onSave={handleSave}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

// === Helper functions ===

async function fetchAvatarLimit(): Promise<LimitInfo> {
  const token = getAuthToken();
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/api/avatars/limit`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) {
    throw new Error('Failed to fetch avatar limit');
  }
  return response.json();
}
