// src/components/ImageUploader/ImageUploader.tsx
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus } from "lucide-react";

interface ImageUploaderProps {
  onUpload?: (files: File[]) => void;
}

export const ImageUploader = ({
  onUpload = () => {},
}: ImageUploaderProps) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onUpload(acceptedFiles);
    },
    [onUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "image/gif": [],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`flex aspect-square cursor-pointer flex-col items-center justify-center nb-heavy-border border-2 border-dashed
                  border-black text-white transition-colors
                  hover:border-primary hover:text-primary bg-black w-20 h-20
                  ${isDragActive ? "border-primary bg-primary/10" : ""}`}
    >
      <input {...getInputProps()} />
      <ImagePlus size={16} />
      <span className="text-center text-[10px] mt-0.5 leading-tight">
        {isDragActive ? "Бросьте" : "Загрузить"}
      </span>
    </div>
  );
};
