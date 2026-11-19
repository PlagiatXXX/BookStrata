import type { Book } from "@/types";

export interface ProcessBookFilesOptions {
  /** Максимальный размер одного файла (байт). По умолчанию 5 MB. */
  maxFileSize?: number;
  /** Максимальный суммарный размер (байт). По умолчанию 30 MB. */
  maxTotalSize?: number;
}

export interface ProcessBookFilesError {
  title: string;
  description: string;
}

export interface ProcessBookFilesResult {
  added: Book[];
  skipped: number;
  error?: ProcessBookFilesError;
}

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_SIZE = 30 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Не удалось прочитать файл «${file.name}»`));
    reader.readAsDataURL(file);
  });
}

/**
 * Читает файлы обложек и формирует массив новых книг (без дубликатов).
 * Не делает dispatch и не показывает тосты — это ответственность вызывающего кода.
 */
export async function processBookFiles(
  files: File[],
  existingBooks: Record<string, Book>,
  options?: ProcessBookFilesOptions,
): Promise<ProcessBookFilesResult> {
  const maxFileSize = options?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
  const maxTotalSize = options?.maxTotalSize ?? DEFAULT_MAX_TOTAL_SIZE;

  // Проверяем каждый файл
  const tooBig = files.find((f) => f.size > maxFileSize);
  if (tooBig) {
    return {
      added: [],
      skipped: 0,
      error: {
        title: "Файл слишком большой",
        description: `«${tooBig.name}» больше ${Math.round(maxFileSize / 1024 / 1024)} MB. Максимум ${Math.round(maxFileSize / 1024 / 1024)} MB на одну обложку.`,
      },
    };
  }

  // Проверяем суммарный размер
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > maxTotalSize) {
    return {
      added: [],
      skipped: 0,
      error: {
        title: "Слишком большой общий объём",
        description: `Общий размер файлов (${(totalSize / 1024 / 1024).toFixed(1)} MB) превышает лимит ${Math.round(maxTotalSize / 1024 / 1024)} MB.`,
      },
    };
  }

  const existingKeys = new Set(
    Object.values(existingBooks).map(
      (b) => `${b.title.toLowerCase()}|${(b.author || "").toLowerCase()}`,
    ),
  );

  const added: Book[] = [];
  let skipped = 0;

  for (const file of files) {
    const title = file.name.replace(/\.[^/.]+$/, "");
    const author = "Неизвестен";
    const key = `${title.toLowerCase()}|${author.toLowerCase()}`;

    // Пропускаем дубликаты
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }
    existingKeys.add(key);

    let coverImageUrl: string;
    try {
      coverImageUrl = await readFileAsDataUrl(file);
    } catch (err) {
      return {
        added,
        skipped,
        error: {
          title: "Ошибка чтения файла",
          description: err instanceof Error ? err.message : `Не удалось прочитать «${file.name}»`,
        },
      };
    }

    const bookId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    added.push({
      id: bookId,
      title,
      author,
      coverImageUrl,
    });
  }

  return { added, skipped };
}
