import { useState, useEffect, useReducer } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Image as ImageIcon,
  Upload as UploadIcon,
  Sparkles,
  Check,
  Info,
} from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { Avatar } from "./Avatar";
import { presetCategories, allPresets, getInitials } from "./presets";
import type { PresetStyle } from "./presets";
import { getAuthToken } from "@/lib/authApi";

interface AvatarSelectorProps {
  currentAvatar?: string | null;
  username?: string;
  onSave: (avatarUrl: string) => Promise<void>;
  onClose: () => void;
}

type TabId = "presets" | "ai" | "upload";

const tabs: { id: TabId; label: string; icon: typeof ImageIcon }[] = [
  { id: "presets", label: "Пресеты", icon: ImageIcon },
  { id: "ai", label: "AI Генерация", icon: Sparkles },
  { id: "upload", label: "Загрузить", icon: UploadIcon },
];

interface LimitInfo {
  used: number;
  limit: number;
  remaining: number;
}

// === State types for useReducer ===
interface PreviewState {
  url: string | null;
  loadState: "idle" | "loading" | "ready" | "error";
}

type PreviewAction =
  | { type: "SET_PREVIEW"; url: string | null; loadState?: PreviewState["loadState"] }
  | { type: "SET_LOAD_STATE"; loadState: PreviewState["loadState"] };

function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    case "SET_PREVIEW":
      return {
        url: action.url,
        loadState: action.loadState ?? (action.url ? "loading" : "idle"),
      };
    case "SET_LOAD_STATE":
      return { ...state, loadState: action.loadState };
    default:
      return state;
  }
}

interface GenerationState {
  isGenerating: boolean;
  isWaitingForResult: boolean;
  generationBaseAvatar: string | null;
  error: string | null;
}

type GenerationAction =
  | { type: "START_GENERATION"; baseAvatar: string | null }
  | { type: "GENERATION_SUCCESS"; imageUrl: string; remaining?: number }
  | { type: "GENERATION_ERROR"; error: string }
  | { type: "GENERATION_COMPLETE" }
  | { type: "TIMEOUT"; error: string }
  | { type: "CLEAR_ERROR" };

function generationReducer(
  state: GenerationState,
  action: GenerationAction,
): GenerationState {
  switch (action.type) {
    case "START_GENERATION":
      return {
        isGenerating: true,
        isWaitingForResult: false,
        generationBaseAvatar: action.baseAvatar,
        error: null,
      };
    case "GENERATION_SUCCESS":
      return {
        ...state,
        isGenerating: false,
        error: null,
      };
    case "GENERATION_ERROR":
      return {
        ...state,
        isGenerating: false,
        error: action.error,
      };
    case "GENERATION_COMPLETE":
      return {
        ...state,
        isGenerating: false,
        isWaitingForResult: false,
      };
    case "TIMEOUT":
      return {
        ...state,
        isWaitingForResult: false,
        isGenerating: false,
        error: action.error,
      };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

const initialPreviewState: PreviewState = {
  url: null,
  loadState: "idle",
};

const initialGenerationState: GenerationState = {
  isGenerating: false,
  isWaitingForResult: false,
  generationBaseAvatar: null,
  error: null,
};

export function AvatarSelector({
  currentAvatar,
  username,
  onSave,
  onClose,
}: AvatarSelectorProps) {
  const queryClient = useQueryClient();
  
  // Простые состояния через useState
  const [activeTab, setActiveTab] = useState<TabId>("presets");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<PresetStyle>("cartoon");
  
  // Сложные состояния через useReducer
  const [preview, dispatchPreview] = useReducer(previewReducer, initialPreviewState);
  const [generation, dispatchGeneration] = useReducer(generationReducer, initialGenerationState);

  const currentUrl =
    preview.loadState === "ready" && preview.url ? preview.url : currentAvatar;
  const hasSelection = preview.url !== null && preview.loadState === "ready";
  const isBusy =
    generation.isGenerating || generation.isWaitingForResult || preview.loadState === "loading";

  // Загружаем информацию о лимитах через useQuery
  const { data: limitData } = useQuery({
    queryKey: ["avatarLimit"],
    queryFn: async () => {
      const token = getAuthToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/avatars/limit`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) {
        throw new Error("Failed to fetch avatar limit");
      }
      return response.json() as Promise<LimitInfo>;
    },
    enabled: activeTab === "ai",
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const limitInfo = limitData ?? null;

  // Проверка: если аватар обновился во время ожидания генерации
  useEffect(() => {
    if (!generation.isWaitingForResult) return;
    if (currentAvatar && currentAvatar !== generation.generationBaseAvatar) {
      dispatchGeneration({ type: "GENERATION_COMPLETE" });
      dispatchPreview({ type: "SET_PREVIEW", url: currentAvatar, loadState: "ready" });
    }
  }, [currentAvatar, generation.isWaitingForResult, generation.generationBaseAvatar]);

  // Таймаут генерации (2 минуты)
  useEffect(() => {
    if (!generation.isWaitingForResult) return;
    const timeoutId = setTimeout(() => {
      dispatchGeneration({
        type: "TIMEOUT",
        error: "Генерация занимает дольше обычного. Попробуйте ещё раз.",
      });
    }, 120000);
    return () => clearTimeout(timeoutId);
  }, [generation.isWaitingForResult]);

  // Polling для загрузки preview изображения
  useEffect(() => {
    if (!preview.url) {
      dispatchPreview({ type: "SET_LOAD_STATE", loadState: "idle" });
      return;
    }

    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 25;
    const delayMs = 2000;

    const tryLoad = () => {
      if (cancelled) return;
      dispatchPreview({ type: "SET_LOAD_STATE", loadState: "loading" });
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        dispatchPreview({ type: "SET_LOAD_STATE", loadState: "ready" });
      };
      img.onerror = () => {
        if (cancelled) return;
        attempt += 1;
        if (attempt >= maxAttempts) {
          dispatchPreview({ type: "SET_LOAD_STATE", loadState: "error" });
          return;
        }
        setTimeout(tryLoad, delayMs);
      };
      if (preview.url) {
        img.src = preview.url;
      }
    };

    tryLoad();

    return () => {
      cancelled = true;
    };
  }, [preview.url]);

  const handlePresetSelect = (preset: (typeof allPresets)[0]) => {
    dispatchPreview({ type: "SET_PREVIEW", url: preset.full, loadState: "ready" });
    dispatchGeneration({ type: "CLEAR_ERROR" });
  };

  // Генерация через Pollinations.ai
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;

    dispatchGeneration({ type: "START_GENERATION", baseAvatar: currentAvatar ?? null });

    try {
      const token = getAuthToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/avatars/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ prompt: aiPrompt.trim() }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          dispatchGeneration({ type: "GENERATION_ERROR", error: data.error || "Дневной лимит исчерпан" });
          // Обновляем кэш useQuery
          queryClient.setQueryData(["avatarLimit"], (prev: LimitInfo | null) =>
            prev ? { ...prev, remaining: 0 } : null,
          );
        } else {
          dispatchGeneration({ type: "GENERATION_ERROR", error: data.error || "Ошибка генерации" });
        }
        return;
      }

      if (data.imageUrl) {
        dispatchPreview({ type: "SET_PREVIEW", url: data.imageUrl, loadState: "loading" });
        dispatchGeneration({ type: "GENERATION_SUCCESS", imageUrl: data.imageUrl, remaining: data.remaining });
        if (data.remaining !== undefined) {
          // Обновляем кэш useQuery
          queryClient.setQueryData(["avatarLimit"], (prev: LimitInfo | null) =>
            prev ? { ...prev, remaining: data.remaining } : null,
          );
        }
      } else {
        // Ожидаем результат генерации
      }
    } catch {
      dispatchGeneration({ type: "GENERATION_ERROR", error: "Ошибка соединения. Попробуйте ещё раз." });
    }
  };

  const handleSave = async () => {
    if (!currentUrl) return;

    setIsSaving(true);
    try {
      await onSave(currentUrl);
      onClose();
    } catch (error) {
      console.error("Failed to save avatar:", error);
      alert("Ошибка при сохранении. Попробуйте ещё раз.");
    } finally {
      setIsSaving(false);
    }
  };

  const remainingGenerations = limitInfo?.remaining ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#1a1a2e] dark:bg-[#1a1a2e] light:bg-white p-6 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white dark:text-white light:text-gray-900">
            Выберите аватар
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Preview */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Avatar url={currentUrl} username={username} size="xl" />
            {(preview.loadState === "loading" || generation.isWaitingForResult) && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Spinner size="lg" />
              </div>
            )}
            {hasSelection && (
              <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1">
                <Check size={16} className="text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
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

        {/* Tab Content */}
        <div className="min-h-75">
          {/* === PRESETS TAB === */}
          {activeTab === "presets" && (
            <div className="space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {Object.entries(presetCategories).map(([key, category]) => (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key as PresetStyle)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      activeCategory === key
                        ? "bg-primary text-white"
                        : "bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 text-gray-400 hover:text-white"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {presetCategories[activeCategory].presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                      preview.url === preset.full
                        ? "border-primary ring-2 ring-primary/50"
                        : "border-transparent hover:border-gray-400"
                    }`}
                  >
                    <img
                      src={preset.full}
                      alt={preset.name}
                      className="w-full h-full object-cover"
                      onLoad={() => dispatchPreview({ type: "SET_LOAD_STATE", loadState: "ready" })}
                      onError={(e) => {
                        // Fallback: если картинка не загрузилась, показываем инициалы
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.avatar-fallback')) {
                          parent.classList.add('flex', 'items-center', 'justify-center', 'bg-surface-light', 'dark:bg-[#2d2d44]');
                          const fallback = document.createElement('span');
                          fallback.className = 'avatar-fallback text-xs font-bold text-gray-400';
                          fallback.textContent = getInitials(preset.name);
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                    {preview.url === preset.full && (
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                        <Check size={20} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* === AI TAB === */}
          {activeTab === "ai" && (
            <div className="space-y-4">
              {/* Информация о лимитах */}
              <div className="flex items-center gap-2 p-3 bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 rounded-xl">
                <Info size={16} className="text-gray-400 shrink-0" />
                <span className="text-sm text-gray-400">
                  Осталось генераций сегодня:{" "}
                  <strong className="text-white">{remainingGenerations}</strong>{" "}
                  / {limitInfo?.limit ?? 10}
                </span>
              </div>

              {generation.error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
                  <p className="text-sm text-red-400">{generation.error}</p>
                </div>
              )}

              {preview.loadState === "loading" && (
                <div className="p-3 bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 rounded-xl">
                  <p className="text-sm text-gray-300">
                    Загружаем изображение. Это может занять немного времени.
                  </p>
                </div>
              )}

              {preview.loadState === "error" && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
                  <p className="text-sm text-red-400">
                    Не удалось загрузить изображение. Попробуйте ещё раз.
                  </p>
                </div>
              )}

              {generation.isWaitingForResult && (
                <div className="p-3 bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 rounded-xl">
                  <p className="text-sm text-gray-300">
                    Генерация запущена. Обычно занимает до 40 секунд. Можно
                    закрыть окно — аватар обновится автоматически.
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="avatar-selector-prompt-input" className="block text-sm font-medium text-gray-300 mb-2">
                  Опишите ваш аватар
                </label>
                <textarea
                  id="avatar-selector-prompt-input"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Например: Мужчина с бородой в очках, синий фон, дружелюбная улыбка"
                  className="w-full h-28 bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 rounded-xl p-4 resize-none text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                onClick={handleAiGenerate}
                disabled={
                  isBusy || !aiPrompt.trim() || remainingGenerations <= 0
                }
                className="relative w-full py-3.5 bg-linear-to-r from-violet-600 to-fuchsia-600 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-500 hover:to-fuchsia-500 transition-all flex items-center justify-center"
              >
                <span className={isBusy ? "opacity-0" : "opacity-100"}>
                  <span className="inline-flex items-center gap-2">
                    <Sparkles size={18} />
                    Сгенерировать
                  </span>
                </span>
                <span
                  className={`absolute inset-0 flex items-center justify-center gap-2 transition-opacity ${
                    isBusy ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <Spinner size="lg" className="border-white/90" />
                  <span>
                    {generation.isGenerating ? "Создаем..." : "Дождитесь результата..."}
                  </span>
                </span>
              </button>
            </div>
          )}

          {/* === UPLOAD TAB === */}
          {activeTab === "upload" && (
            <div className="space-y-4">
              <div
                role="button"
                tabIndex={0}
                aria-label="Загрузить изображение с компьютера"
                className="border-2 border-dashed border-surface-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        alert("Файл слишком большой. Максимум 5MB.");
                        return;
                      }

                      const reader = new FileReader();
                      reader.onload = () => {
                        const base64 = reader.result as string;
                        dispatchPreview({ type: "SET_PREVIEW", url: base64, loadState: "loading" });
                        dispatchGeneration({ type: "CLEAR_ERROR" });
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.click();
                  }
                }}
              >
                <UploadIcon size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-300 font-medium mb-2">
                  Перетащите изображение или нажмите для выбора
                </p>
                <p className="text-sm text-gray-500">
                  JPG, PNG, WebP. Максимум 5MB.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-surface-border">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-medium text-gray-400 hover:text-white transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!hasSelection || isSaving || isBusy}
            className={`relative flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center ${
              hasSelection
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-primary/20 text-primary/50 cursor-not-allowed"
            }`}
          >
            <span className={isSaving ? "opacity-0" : "opacity-100"}>
              Сохранить
            </span>
            <span
              className={`absolute inset-0 flex items-center justify-center gap-2 transition-opacity ${
                isSaving ? "opacity-100" : "opacity-0"
              }`}
            >
              <Spinner size="lg" className="border-white/90" />
              <span>Сохраняем...</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
