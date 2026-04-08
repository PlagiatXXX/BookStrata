import { Upload as UploadIcon } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import type { UploadTabProps } from "../types";
import { MAX_FILE_SIZE_MB } from "../constants";

export function UploadTab({
  onFileSelect,
  previewLoadState,
  error,
  isBusy = false,
}: UploadTabProps) {
  const handleFileSelect = (file: File) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`Файл слишком большой. Максимум ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onFileSelect(base64);
    };
    reader.readAsDataURL(file);
  };

  const openFilePicker = () => {
    if (isBusy) {
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
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

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
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
