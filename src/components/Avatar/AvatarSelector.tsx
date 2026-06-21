import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createLogger } from "@/lib/logger";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { apiGenerateAvatar, apiGetAvatarLimit, type AvatarLimitInfo } from "@/lib/avatarApi";
import { cropAvatar } from "@/utils/cropAvatar";
import { AvatarSelectorHeader } from "./components/AvatarSelectorHeader";
import { AvatarPreview } from "./components/AvatarPreview";
import { TabNavigation } from "./components/TabNavigation";
import { PresetsTab } from "./components/PresetsTab";
import { AiGenerationTab } from "./components/AiGenerationTab";
import { UploadTab } from "./components/UploadTab";
import { AvatarSelectorFooter } from "./components/AvatarSelectorFooter";
import { useAvatarPreview } from "./hooks/useAvatarPreview";
import { apiTrackEvent } from "@/lib/analyticsApi";
import type {
  AvatarPosition,
  AvatarPreset,
  AvatarSelectorProps,
  PresetStyle,
  TabId,
} from "./types";
import { QUERY_GC_TIME_MS, QUERY_STALE_TIME_MS } from "./constants";

const logger = createLogger("AvatarSelector", { color: "purple" });

export function AvatarSelector({
  currentAvatar,
  username,
  onSave,
  onClose,
}: AvatarSelectorProps) {
  useBodyScrollLock(true)

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("presets");
  const [activeCategory, setActiveCategory] = useState<PresetStyle>("cartoon");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPosition, setAvatarPosition] = useState<AvatarPosition>({ x: 0, y: 0 });

  const { preview, setPreviewUrl } = useAvatarPreview();

  const { data: limitData } = useQuery({
    queryKey: ["avatarLimit"],
    queryFn: apiGetAvatarLimit,
    enabled: activeTab === "ai",
    staleTime: QUERY_STALE_TIME_MS,
    gcTime: QUERY_GC_TIME_MS,
  });

  const generateAvatarMutation = useMutation({
    mutationFn: (prompt: string) => apiGenerateAvatar(prompt),
    onMutate: () => {
      setError(null);
    },
    onSuccess: (data) => {
      setPreviewUrl(data.imageUrl);
      queryClient.setQueryData(
        ["avatarLimit"],
        (previous: AvatarLimitInfo | undefined) => {
          if (!previous) return previous;
          return {
            ...previous,
            remaining: data.remaining,
            used: Math.max(0, previous.limit - data.remaining),
          };
        },
      );
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Не удалось сгенерировать аватар",
      );
    },
  });

  const currentUrl = preview.url ?? currentAvatar ?? null;
  const hasSelection = preview.url !== null && preview.loadState === "ready";
  const isPreviewLoading = preview.loadState === "loading";
  const isGenerating = generateAvatarMutation.isPending;
  const isBusy = isGenerating || isPreviewLoading || isSaving;
  const busyLabel = isSaving
    ? "Сохраняем..."
    : isGenerating
      ? "Генерируем..."
      : isPreviewLoading
        ? "Загружаем..."
        : undefined;
  const limitInfo = limitData ?? null;
  const remainingGenerations = limitInfo?.remaining ?? 0;

  const handlePresetSelect = (preset: AvatarPreset) => {
    setError(null);
    setPreviewUrl(preset.full);
    setAvatarPosition({ x: 0, y: 0 });
  };

  const handleAiGenerate = async () => {
    const prompt = aiPrompt.trim();

    if (!prompt || isGenerating) {
      return;
    }

    window.ym?.(109755750, 'reachGoal', 'ai_avatar')
    apiTrackEvent('ai_avatar')
    await generateAvatarMutation.mutateAsync(prompt);
    setAvatarPosition({ x: 0, y: 0 });
  };

  const handleFileSelect = (fileDataUrl: string) => {
    setError(null);
    setPreviewUrl(fileDataUrl);
    setAvatarPosition({ x: 0, y: 0 });
  };

  const handleSave = async () => {
    if (!preview.url || preview.loadState !== "ready") {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      // Обрезаем изображение с учётом позиции
      const cropped = await cropAvatar(
        preview.url,
        avatarPosition.x,
        avatarPosition.y,
      );
      await onSave(cropped);
      onClose();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Не удалось сохранить аватар";

      logger.error(
        saveError instanceof Error ? saveError : new Error(String(saveError)),
        { action: "saveAvatar" },
      );
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#1a1a2e] dark:bg-[#1a1a2e] light:bg-white p-6 shadow-2xl animate-scale-in">
        <AvatarSelectorHeader onClose={onClose} />

        <AvatarPreview
          currentUrl={currentUrl}
          username={username}
          hasSelection={hasSelection}
          isBusy={isBusy}
          busyLabel={busyLabel}
          position={avatarPosition}
          onPositionChange={setAvatarPosition}
        />

        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="min-h-75">
          <div
            id="tabpanel-presets"
            role="tabpanel"
            aria-labelledby="tab-presets"
            hidden={activeTab !== "presets"}
          >
            {activeTab === "presets" && (
              <PresetsTab
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
                onPresetSelect={handlePresetSelect}
                selectedPresetUrl={preview.url}
                isBusy={isBusy}
              />
            )}
          </div>

          <div
            id="tabpanel-ai"
            role="tabpanel"
            aria-labelledby="tab-ai"
            hidden={activeTab !== "ai"}
          >
            {activeTab === "ai" && (
              <AiGenerationTab
                aiPrompt={aiPrompt}
                onPromptChange={setAiPrompt}
                onGenerate={handleAiGenerate}
                isBusy={isBusy}
                isGenerating={isGenerating}
                error={error}
                previewLoadState={preview.loadState}
                remainingGenerations={remainingGenerations}
                limitInfo={limitInfo}
              />
            )}
          </div>

          <div
            id="tabpanel-upload"
            role="tabpanel"
            aria-labelledby="tab-upload"
            hidden={activeTab !== "upload"}
          >
            {activeTab === "upload" && (
              <UploadTab
                onFileSelect={handleFileSelect}
                previewLoadState={preview.loadState}
                error={error}
                isBusy={isBusy}
              />
            )}
          </div>
        </div>

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
