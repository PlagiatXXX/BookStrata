// src/components/ImageUploader/ImageUploader.tsx
import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { ImagePlus } from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface ImageUploaderProps {
  onUpload?: (files: File[]) => void;
}

export const ImageUploader = ({
  onUpload = () => {},
}: ImageUploaderProps) => {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      onUpload(acceptedFiles);
    },
    [onUpload],
  );

  const onDropRejected = useCallback(
    (fileRejections: FileRejection[]) => {
      const tooBig = fileRejections.some(
        (r) => r.file.size > MAX_FILE_SIZE,
      );
      setError(
        tooBig
          ? "Файл слишком большой. Максимум 5 MB."
          : "Можно загружать только изображения (JPEG, PNG, WebP, GIF).",
      );
    },
    [],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    maxSize: MAX_FILE_SIZE,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "image/gif": [],
    },
  });

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        {...getRootProps()}
        className={`flex aspect-square cursor-pointer flex-col items-center justify-center nb-heavy-border border-2 border-dashed
                  border-black text-white transition-colors
                  hover:border-primary hover:text-primary bg-black w-20 h-20
                  ${isDragActive ? "border-primary bg-primary/10" : ""}
                  ${error ? "border-red-500" : ""}`}
      >
        <input {...getInputProps()} />
        <ImagePlus size={16} />
        <span className="text-center text-[10px] mt-0.5 leading-tight">
          {isDragActive ? "Бросьте" : "Загрузить"}
        </span>
      </div>
      {error && (
        <span className="text-[10px] text-red-400 text-center leading-tight">
          {error}
        </span>
      )}
    </div>
  );
};
