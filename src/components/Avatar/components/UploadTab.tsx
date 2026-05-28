import { useState, useRef } from "react";
import { Upload as UploadIcon } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { useNsfwCheck } from "@/hooks/useNsfwCheck";
import { NsfwWarning } from "@/components/NsfwWarning/NsfwWarning";
import { apiCreateFlag } from "@/lib/moderationApi";
import type { UploadTabProps } from "../types";
import type { NsfwResult } from "@/hooks/useNsfwCheck";
import { MAX_FILE_SIZE_MB } from "../constants";

export function UploadTab({
  onFileSelect,
  previewLoadState,
  error,
  isBusy = false,
}: UploadTabProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [nsfwState, setNsfwState] = useState<{
    checking: boolean;
    result: NsfwResult | null;
    pendingFile: File | null;
    pendingBase64: string | null;
  }>({ checking: false, result: null, pendingFile: null, pendingBase64: null });
  const pendingFileRef = useRef<File | null>(null);

  const { checkImage } = useNsfwCheck();

  const handleFileSelect = async (file: File) => {
    setLocalError(null);

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setLocalError(`Файл слишком большой. Максимум ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setNsfwState({ checking: true, result: null, pendingFile: file, pendingBase64: null });

    try {
      const result = await checkImage(file);

      if (result.isNsfw) {
        const reader = new FileReader();
        reader.onload = () => {
          setNsfwState({
            checking: false,
            result,
            pendingFile: file,
            pendingBase64: reader.result as string,
          });
        };
        reader.readAsDataURL(file);
        return
      }

      const reader = new FileReader();
      reader.onload = () => {
        onFileSelect(reader.result as string);
        setNsfwState({ checking: false, result: null, pendingFile: null, pendingBase64: null });
      };
      reader.readAsDataURL(file);
    } catch {
      setNsfwState({ checking: false, result: null, pendingFile: null, pendingBase64: null });
      const reader = new FileReader();
      reader.onload = () => onFileSelect(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleNsfwOverride = () => {
    if (nsfwState.pendingBase64) {
      const maxScore = nsfwState.result
        ? Math.max(...nsfwState.result.predictions.map((p) => p.probability))
        : null
      apiCreateFlag({
        imageUrl: nsfwState.pendingBase64,
        flagType: "avatar",
        nsfwScore: maxScore,
      }).catch(() => {})
      onFileSelect(nsfwState.pendingBase64);
    }
    setNsfwState({ checking: false, result: null, pendingFile: null, pendingBase64: null });
  };

  const handleNsfwDismiss = () => {
    setNsfwState({ checking: false, result: null, pendingFile: null, pendingBase64: null });
  };

  const openFilePicker = () => {
    if (isBusy || nsfwState.checking) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        pendingFileRef.current = file;
        handleFileSelect(file);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Загрузить изображение с компьютера"
        className={`border-2 border-dashed border-surface-border rounded-2xl p-8 text-center transition-colors ${
          isBusy
            ? "cursor-not-allowed opacity-70"
            : "hover:border-primary/50 cursor-pointer"
        }`}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && !isBusy) {
            event.preventDefault();
            openFilePicker();
          }
        }}
      >
        {previewLoadState === "loading" ? (
          <div className="flex flex-col items-center gap-3">
            <Spinner
              size="lg"
              className="border-white/25 border-t-white border-l-white"
            />
            <p className="text-sm text-gray-300">
              Загружаем изображение и обновляем preview.
            </p>
          </div>
        ) : (
          <>
            <UploadIcon size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-300 font-medium mb-2">
              Перетащите изображение или нажмите для выбора
            </p>
            <p className="text-sm text-gray-500">
              JPG, PNG, WebP. Максимум {MAX_FILE_SIZE_MB}MB.
            </p>
          </>
        )}
      </div>

      <NsfwWarning
        isChecking={nsfwState.checking}
        isNsfw={nsfwState.result?.isNsfw ?? false}
        predictions={nsfwState.result?.predictions}
        onOverride={handleNsfwOverride}
        onDismiss={handleNsfwDismiss}
      />

      {(error || localError) && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
          <p className="text-sm text-red-400">{error || localError}</p>
        </div>
      )}

      {previewLoadState === "error" && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
          <p className="text-sm text-red-400">
            Не удалось загрузить изображение. Попробуйте ещё раз.
          </p>
        </div>
      )}
    </div>
  );
}
