// src/pages/AdminBooksPage/components/BookEditModal.tsx
// Редактор книги (Фаза 7): поля SEO-карточки, slug с историей, статус
// (publish через инвариант полноты), обогащение из Google Books, merge,
// редактор contextChain ({ icon, title, text }) с иконками Material Symbols.
import { useRef, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  X,
  Upload,
  Film,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  AdminBookDetail,
  BookUpdateInput,
  ContextChainItem,
  ReadingGuide,
  ReadingProfile,
} from "@/lib/adminBooksApi";
import { uploadBookCover, uploadBookAnimatedCover } from "@/lib/adminBooksApi";
import { parseAnimatedCoverUrl, formatAnimatedCoverUrl } from "@/utils/animatedCover";
import { buildBookAnimationPrompt, buildBookAnimationSpecs } from "./coverPromptHelper";
import { ReadingProfilePrompt } from "./ReadingProfilePrompt";
import { ReadingGuidePrompt } from "./ReadingGuidePrompt";

/** Обязательные ключи AI-паспорта (для клиентской проверки поля в модалке).
 *  Полную zod-валидацию делает бэкенд при PATCH. */
const GUIDE_REQUIRED_KEYS = [
  "short_hook",
  "target_audience",
  "friction_points",
  "reading_pace",
  "difficulty",
  "vibe",
  "key_takeaways",
] as const;

/** Срезает markdown-обёртку ```json ... ``` из ответа ИИ */
function stripMarkdownFence(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "");
  }
  return cleaned;
}

/** Парсит JSON из чата ИИ → объект паспорта | null (битый JSON) */
function parseGuideJson(raw: string): ReadingGuide | null {
  try {
    const parsed: unknown = JSON.parse(stripMarkdownFence(raw));
    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    for (const key of GUIDE_REQUIRED_KEYS) {
      if (!(key in obj)) return null;
    }
    return parsed as ReadingGuide;
  } catch {
    return null;
  }
}

const MATERIAL_SYMBOLS = [
  "menu_book",
  "movie",
  "public",
  "psychology",
  "lightbulb",
  "history_edu",
  "forum",
  "newspaper",
  "star",
  "flag",
  "code",
  "translate",
  "groups",
  "emoji_objects",
  "fact_check",
  "format_quote",
];

// Русские названия иконок для выбора в админке
const ICON_LABELS: Record<string, string> = {
  menu_book: "Книга",
  movie: "Фильм",
  public: "Мир",
  psychology: "Психология",
  lightbulb: "Идея",
  history_edu: "История",
  forum: "Обсуждение",
  newspaper: "Пресса",
  star: "Звезда",
  flag: "Достижение",
  code: "Технологии",
  translate: "Перевод",
  groups: "Сообщество",
  emoji_objects: "Заметка",
  fact_check: "Факт",
  format_quote: "Цитата",
};

interface Props {
  book: AdminBookDetail;
  saving: boolean;
  publishing: boolean;
  unpublishing: boolean;
  enriching: boolean;
  enrichResult: string[] | null;
  onSave: (patch: BookUpdateInput) => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onEnrich: () => void;
  onMerge: () => void;
  onClose: () => void;
}

export function BookEditModal({
  book,
  saving,
  publishing,
  unpublishing,
  enriching,
  enrichResult,
  onSave,
  onPublish,
  onUnpublish,
  onEnrich,
  onMerge,
  onClose,
}: Props) {
  const [form, setForm] = useState<BookUpdateInput>({});
  const [chain, setChain] = useState<ContextChainItem[]>(
    book.contextChain ?? [],
  );
  // AI-паспорт: сырой текст (может быть с ```json-обёрткой от ИИ) и ошибка
  // валидации. Парсинг — на blur; PATCH отправляет объект или null.
  const [guideInput, setGuideInput] = useState<string>(
    book.readingGuide ? JSON.stringify(book.readingGuide, null, 2) : "",
  );
  const [guideError, setGuideError] = useState<string | null>(null);
  // Reading DNA: сырой JSON readingProfile
  const [profileInput, setProfileInput] = useState<string>(
    book.readingProfile ? JSON.stringify(book.readingProfile, null, 2) : "",
  );
  const [profileError, setProfileError] = useState<string | null>(null);
  // Сырая строка тегов: парсится в массив только при сохранении, иначе
  // запятая мгновенно отфильтровывается как пустой тег и не вводится
  const [tagsInput, setTagsInput] = useState((book.tags ?? []).join(", "));
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCoverUpload = async (file: File | undefined) => {
    if (!file) return;
    setCoverUploading(true);
    setCoverError(null);
    try {
      const { coverImageUrl } = await uploadBookCover(file);
      set("coverImageUrl", coverImageUrl);
    } catch {
      setCoverError("Не удалось загрузить обложку");
    } finally {
      setCoverUploading(false);
    }
  };

  const [videoUploading, setVideoUploading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [syncCoverPoster, setSyncCoverPoster] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedSpecs, setCopiedSpecs] = useState(false);
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleVideoUpload = async (file: File | undefined) => {
    if (!file) return;
    setVideoUploading(true);
    setVideoError(null);
    try {
      const res = await uploadBookAnimatedCover(file, {
        mode: "original",
        aspectRatio: "original",
      });
      set("animatedCoverUrl", res.animatedCoverUrl);
      if (syncCoverPoster && res.coverImageUrl) {
        set("coverImageUrl", res.coverImageUrl);
      }
    } catch {
      setVideoError("Не удалось обработать видео. Проверьте формат (MP4/WebM) и размер (до 35 МБ)");
    } finally {
      setVideoUploading(false);
    }
  };

  const currentBookTitle = (form.title !== undefined ? form.title : book.title) || "Без названия";
  const currentBookAuthor = form.author !== undefined ? form.author : book.author;

  const handleCopyPrompt = () => {
    const text = buildBookAnimationPrompt(currentBookTitle, currentBookAuthor);
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleCopySpecs = () => {
    const text = buildBookAnimationSpecs();
    navigator.clipboard.writeText(text);
    setCopiedSpecs(true);
    setTimeout(() => setCopiedSpecs(false), 2500);
  };

  const set = <K extends keyof BookUpdateInput>(
    key: K,
    value: BookUpdateInput[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const setChainItem = (i: number, patch: Partial<ContextChainItem>) =>
    setChain((c) =>
      c.map((item, idx) => (idx === i ? { ...item, ...patch } : item)),
    );

  const moveChain = (i: number, dir: -1 | 1) =>
    setChain((c) => {
      const j = i + dir;
      if (j < 0 || j >= c.length) return c;
      const next = [...c];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // Валидация AI-паспорта при уходе из поля: чистый JSON → pretty-print в
  // поле + объект в форму; пусто → null (паспорт снимается); битый → ошибка
  // и поле НЕ попадает в патч (чтобы не отправить мусор на сервер).
  const handleGuideBlur = () => {
    const raw = guideInput.trim();
    if (!raw) {
      setGuideError(null);
      set("readingGuide", null);
      return;
    }
    const parsed = parseGuideJson(raw);
    if (parsed) {
      setGuideInput(JSON.stringify(parsed, null, 2));
      setGuideError(null);
      set("readingGuide", parsed);
    } else {
      setGuideError(
        "Невалидный JSON паспорта: проверьте кавычки, скобки и наличие всех 7 полей",
      );
    }
  };

  // Reading DNA: валидация readingProfile при уходе из поля
  const PROFILE_REQUIRED_KEYS = [
    "storyFocus", "emotionalWeight", "pace", "darkness", "scope", "complexity", "confidence", "source",
  ] as const;

  const handleProfileBlur = () => {
    const raw = profileInput.trim();
    if (!raw) {
      setProfileError(null);
      set("readingProfile", null);
      return;
    }
    try {
      const parsed: unknown = JSON.parse(stripMarkdownFence(raw));
      if (typeof parsed !== "object" || parsed === null) {
        setProfileError("Невалидный JSON");
        return;
      }
      const obj = parsed as Record<string, unknown>;
      for (const key of PROFILE_REQUIRED_KEYS) {
        if (!(key in obj)) {
          setProfileError(`Отсутствует поле: ${key}`);
          return;
        }
      }
      setProfileInput(JSON.stringify(parsed, null, 2));
      setProfileError(null);
      set("readingProfile", parsed as ReadingProfile);
    } catch {
      setProfileError("Невалидный JSON: проверьте синтаксис");
    }
  };

  const isPublished = book.status === "published";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-(--ink-3) bg-(--bg-1) p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-(--ink-0)">{book.title}</h2>
            <p className="mt-0.5 text-sm text-(--ink-1)">
              #{book.id}
              {book.slug ? ` · /books/${book.slug}` : ""} ·{" "}
              <span
                className={isPublished ? "text-emerald-400" : "text-amber-400"}
              >
                {isPublished ? "опубликована" : "черновик"}
              </span>
            </p>
            {book.slugHistory.length > 0 && (
              <p className="mt-1 text-xs text-(--ink-2)">
                История slug (301):{" "}
                {book.slugHistory.map((h) => h.oldSlug).join(", ")}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-(--ink-1) hover:bg-(--ink-3) hover:text-white cursor-pointer"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-(--ink-1)">
              Название *
            </span>
            <input
              value={form.title ?? book.title}
              onChange={(e) => set("title", e.target.value)}
              className="w-full rounded-lg border border-(--ink-3) bg-(--bg-0) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-(--ink-1)">Автор *</span>
            <input
              value={form.author ?? book.author ?? ""}
              onChange={(e) => set("author", e.target.value)}
              className="w-full rounded-lg border border-(--ink-3) bg-(--bg-0) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-(--ink-1)">Slug</span>
            <input
              value={form.slug ?? book.slug ?? ""}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="латиница, цифры, дефисы"
              className="w-full rounded-lg border border-(--ink-3) bg-(--bg-0) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-(--ink-1)">
              Год издания *
            </span>
            <input
              type="number"
              value={form.publishedYear ?? book.publishedYear ?? ""}
              onChange={(e) =>
                set(
                  "publishedYear",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              className="w-full rounded-lg border border-(--ink-3) bg-(--bg-0) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-(--ink-1)">Жанр *</span>
            <input
              value={form.genre ?? book.genre ?? ""}
              onChange={(e) => set("genre", e.target.value)}
              className="w-full rounded-lg border border-(--ink-3) bg-(--bg-0) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-(--ink-1)">
              Рейтинг каталога (0–10)
            </span>
            <input
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={form.rating ?? book.rating ?? ""}
              onChange={(e) =>
                set(
                  "rating",
                  e.target.value ? parseFloat(e.target.value) : null,
                )
              }
              placeholder="8.5"
              className="w-full rounded-lg border border-(--ink-3) bg-(--bg-0) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-(--ink-1)">
              Теги (через запятую)
            </span>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full rounded-lg border border-(--ink-3) bg-(--bg-0) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-(--ink-1)">
              Обложка (URL)
            </span>
            <div className="flex gap-2">
              <input
                value={form.coverImageUrl ?? book.coverImageUrl}
                onChange={(e) => set("coverImageUrl", e.target.value)}
                placeholder="/images/books/... или http(s)://"
                className="w-full rounded-lg border border-(--ink-3) bg-(--bg-0) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleCoverUpload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={coverUploading}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-(--ink-3) px-3 py-2 text-sm text-(--ink-0) hover:bg-(--ink-3) disabled:opacity-50 cursor-pointer"
              >
                <Upload size={14} />
                {coverUploading ? "Загрузка…" : "Загрузить"}
              </button>
            </div>
            {coverError && (
              <p className="mt-1 text-xs text-red-400">{coverError}</p>
            )}
          </label>
          <div className="md:col-span-2 rounded-xl border border-(--ink-3) bg-(--bg-0)/60 p-4">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-(--ink-0) flex items-center gap-2">
                  <Film size={16} className="text-(--accent-main)" />
                  Живая анимированная обложка (видео)
                </span>
                {(form.animatedCoverUrl !== undefined ? form.animatedCoverUrl : book.animatedCoverUrl) && (
                  <button
                    type="button"
                    onClick={() => set("animatedCoverUrl", null)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                  >
                    Удалить видео
                  </button>
                )}
              </div>
              <p className="text-xs text-(--ink-1)">
                Загрузите исходное видео (MP4/WebM). Сервер сожмет его через ffmpeg (H.264, ~400 КБ, no-audio, faststart) и создаст четкий постер первого кадра в качестве обложки.
              </p>
              {/* Блок помощи и генерации в AI */}
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <Sparkles size={14} className="text-amber-400" />
                    Как сгенерировать видео без банов и в точном размере 2:3
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPromptDetails(!showPromptDetails)}
                    className="flex items-center gap-1 text-[11px] text-amber-400/80 hover:text-amber-300 cursor-pointer"
                  >
                    {showPromptDetails ? "Скрыть промпт" : "Показать промпт"}
                    {showPromptDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
                <p className="text-[11px] text-(--ink-1) leading-relaxed">
                  Используйте наш готовый режиссёрский промпт: он заставляет модель сохранять пропорции 2:3, не ломать лица и текст обложки, а также содержит формулировки добросовестного использования (Fair Use), снимающие ложные отказы из-за авторских прав в Kling, Luma и Runway.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1.5 rounded-md bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 px-2.5 py-1 text-xs font-medium text-amber-200 transition-colors cursor-pointer"
                  >
                    {copiedPrompt ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    {copiedPrompt ? "Скопировано в буфер!" : "Скопировать режиссёрский промпт"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopySpecs}
                    className="flex items-center gap-1.5 rounded-md bg-(--bg-1) hover:bg-(--bg-0) border border-(--ink-3) px-2.5 py-1 text-xs text-(--ink-1) hover:text-(--ink-0) transition-colors cursor-pointer"
                  >
                    {copiedSpecs ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    {copiedSpecs ? "Скопировано!" : "Краткие техпараметры"}
                  </button>
                </div>
                {showPromptDetails && (
                  <div className="mt-2 rounded border border-(--ink-3) bg-black/50 p-2.5">
                    <pre className="text-[11px] text-(--ink-1) font-mono whitespace-pre-wrap select-all max-h-48 overflow-y-auto">
                      {buildBookAnimationPrompt(currentBookTitle, currentBookAuthor)}
                    </pre>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-(--ink-1)">
                <input
                  type="checkbox"
                  checked={syncCoverPoster}
                  onChange={(e) => setSyncCoverPoster(e.target.checked)}
                  className="rounded border-(--ink-3) text-(--accent-main) focus:ring-(--accent-main)"
                />
                Обновить статичную обложку книги из 1-го кадра видео (четкий WebP-постер)
              </label>
              <div className="flex gap-2">
                <input
                  value={(form.animatedCoverUrl !== undefined ? form.animatedCoverUrl : book.animatedCoverUrl) ?? ""}
                  onChange={(e) => set("animatedCoverUrl", e.target.value.trim() || null)}
                  placeholder="/images/books/... или https://cdn.bookstrata.ru/.../video.mp4"
                  className="w-full rounded-lg border border-(--ink-3) bg-(--bg-1) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*,.mp4,.webm,.mov,.m4v"
                  className="hidden"
                  onChange={(e) => {
                    handleVideoUpload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={videoUploading}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-(--accent-main)/40 bg-(--accent-main)/10 px-3.5 py-2 text-sm font-medium text-(--accent-main) hover:bg-(--accent-main)/20 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <Film size={14} />
                  {videoUploading ? "Сжатие ffmpeg…" : "Загрузить видео"}
                </button>
              </div>
              {videoError && (
                <p className="text-xs text-red-400">{videoError}</p>
              )}
              {(() => {
                const currentVideoUrl = (form.animatedCoverUrl !== undefined ? form.animatedCoverUrl : book.animatedCoverUrl) ?? "";
                if (!currentVideoUrl) return null;
                const { cleanUrl, positionY, objectPosition } = parseAnimatedCoverUrl(currentVideoUrl);

                return (
                  <div className="mt-2 rounded-lg border border-(--ink-3) bg-(--bg-1) p-3 space-y-3">
                    <div className="flex items-start gap-4">
                      <div className="relative w-24 aspect-2/3 overflow-hidden rounded-md border border-(--ink-3) bg-black shrink-0 shadow-sm">
                        <video
                          key={cleanUrl}
                          src={cleanUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          style={{ objectPosition }}
                          className="h-full w-full object-cover transition-[object-position] duration-75"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-(--ink-0) flex items-center gap-1.5">
                            <Sparkles size={13} className="text-amber-400 shrink-0" />
                            <span>Живая обложка включена</span>
                          </p>
                          <span className="font-mono text-[11px] text-(--accent-main) bg-(--accent-main)/10 px-1.5 py-0.5 rounded font-medium">
                            {positionY}%
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[11px] text-(--ink-1) mb-1">
                            <span>Смещение кадра по вертикали:</span>
                            <span className="text-(--ink-2)">
                              {positionY === 0 ? "0% (Верх)" : positionY === 50 ? "50% (Центр)" : positionY === 100 ? "100% (Низ)" : `${positionY}%`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={positionY}
                            onChange={(e) => {
                              const newPos = Math.round(Number(e.target.value));
                              set("animatedCoverUrl", formatAnimatedCoverUrl(cleanUrl, newPos));
                            }}
                            aria-label="Смещение кадра по вертикали"
                            className="w-full accent-(--accent-main) cursor-pointer"
                          />
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <button
                              type="button"
                              onClick={() => set("animatedCoverUrl", formatAnimatedCoverUrl(cleanUrl, 0))}
                              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                                positionY === 0
                                  ? "bg-(--accent-main) text-white font-medium"
                                  : "bg-(--bg-0) text-(--ink-1) hover:bg-(--ink-3)/40 border border-(--ink-3)"
                              }`}
                            >
                              0% Верх
                            </button>
                            <button
                              type="button"
                              onClick={() => set("animatedCoverUrl", formatAnimatedCoverUrl(cleanUrl, 50))}
                              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                                positionY === 50
                                  ? "bg-(--accent-main) text-white font-medium"
                                  : "bg-(--bg-0) text-(--ink-1) hover:bg-(--ink-3)/40 border border-(--ink-3)"
                              }`}
                            >
                              50% Центр
                            </button>
                            <button
                              type="button"
                              onClick={() => set("animatedCoverUrl", formatAnimatedCoverUrl(cleanUrl, 100))}
                              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                                positionY === 100
                                  ? "bg-(--accent-main) text-white font-medium"
                                  : "bg-(--bg-0) text-(--ink-1) hover:bg-(--ink-3)/40 border border-(--ink-3)"
                              }`}
                            >
                              100% Низ
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-(--ink-2) leading-relaxed">
                          Для видео 9:16 (Gemini / Veo): двигайте ползунок, чтобы в рамку 2:3 попали название и имя автора.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm text-(--ink-1)">
              Описание *
            </span>
            <textarea
              rows={3}
              value={form.description ?? book.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              className="w-full resize-y rounded-lg border border-(--ink-3) bg-(--bg-0) px-3 py-2 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
            />
          </label>
        </div>

        {/* AI-паспорт «Гид по чтению» */}
        <div className="mt-5">
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="reading-guide-input"
              className="text-sm font-semibold text-(--ink-0)"
            >
              AI-паспорт «Гид по чтению» (JSON)
            </label>
            {(form.readingGuide ?? book.readingGuide) && !guideError && (
              <span className="text-xs text-emerald-400">✓ Заполнен</span>
            )}
          </div>
          <textarea
            id="reading-guide-input"
            rows={7}
            value={guideInput}
            onChange={(e) => setGuideInput(e.target.value)}
            onBlur={handleGuideBlur}
            placeholder={`{\n  "short_hook": "Суть книги одним предложением",\n  "target_audience": "Кому понравится",\n  "friction_points": "Что может оттолкнуть (конкретика)",\n  "reading_pace": "Динамичный | Размеренный | Медитативный",\n  "difficulty": "Легкое чтение | Средняя сложность | Высокий порог входа",\n  "vibe": "Настроение",\n  "key_takeaways": ["Тезис 1", "Тезис 2", "Тезис 3"]\n}`}
            className={`w-full resize-y rounded-lg border bg-(--bg-0) px-3 py-2 font-mono text-xs text-(--ink-0) outline-none ${
              guideError
                ? "border-red-500 text-red-200"
                : "border-(--ink-3) focus:border-(--accent-main)"
            }`}
          />
          {guideError && (
            <p className="mt-1 text-xs text-red-400">{guideError}</p>
          )}
          <p className="mt-1 text-xs text-(--ink-2)">
            Вставьте ответ ИИ целиком — обёртки ```json удаляются автоматически,
            при сохранении JSON форматируется. Пустое поле снимает паспорт.
          </p>

          {/* Шпаргалка-промпт для AI-генерации паспорта */}
          <ReadingGuidePrompt
            bookTitle={book.title}
            bookAuthor={book.author}
            genre={book.genre}
            tags={book.tags}
            description={book.description}
          />
        </div>

        {/* Reading DNA — readingProfile */}
        <div className="mt-5">
          {/* Шпаргалка-промпт для AI-генерации */}
          <ReadingProfilePrompt
            bookTitle={book.title}
            bookAuthor={book.author}
            genre={book.genre}
            tags={book.tags}
            description={book.description}
          />

          <div className="mb-1 mt-3 flex items-center justify-between">
            <label
              htmlFor="reading-profile-input"
              className="text-sm font-semibold text-(--ink-0)"
            >
              Reading DNA (JSON)
            </label>
            {(form.readingProfile ?? book.readingProfile) && !profileError && (
              <span className="text-xs text-emerald-400">✓ Заполнен</span>
            )}
          </div>
          <textarea
            id="reading-profile-input"
            rows={8}
            value={profileInput}
            onChange={(e) => setProfileInput(e.target.value)}
            onBlur={handleProfileBlur}
            placeholder={`{\n  "storyFocus": 25,      // 0=сюжет, 100=рефлексия\n  "emotionalWeight": 20, // 0=легко, 100=тяжело\n  "pace": 30,            // 0=быстро, 100=погружение\n  "darkness": 15,        // 0=светло, 100=мрачно\n  "scope": 40,           // 0=камерное, 100=эпическое\n  "complexity": 35,      // 0=доступное, 100=многослойное\n  "genreConfidence": 0.9,   // 0–1 точность жанра\n  "confidence": {\n    "storyFocus": 0.95,\n    "emotionalWeight": 0.95,\n    "pace": 0.9,\n    "darkness": 0.95,\n    "scope": 0.85,\n    "complexity": 0.8\n  },\n  "source": "ai" | "manual" | "calibrated"\n}`}
            className={`w-full resize-y rounded-lg border bg-(--bg-0) px-3 py-2 font-mono text-xs text-(--ink-0) outline-none ${
              profileError
                ? "border-red-500 text-red-200"
                : "border-(--ink-3) focus:border-(--accent-main)"
            }`}
          />
          {profileError && (
            <p className="mt-1 text-xs text-red-400">{profileError}</p>
          )}
          <p className="mt-1 text-xs text-(--ink-2)">
            Reading DNA книги: 6 осей (0–100) + genreConfidence (0–1) + confidence (0–1) + source +
            analysis. Используйте AI-промпт или заполните вручную. Пустое поле снимает профиль.
          </p>
        </div>

        {/* Погружение в контекст */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-(--ink-0)">
              «Погружение в контекст» (contextChain)
            </h3>
            <button
              onClick={() =>
                setChain((c) => [
                  ...c,
                  { icon: "menu_book", title: "", text: "" },
                ])
              }
              className="flex items-center gap-1 rounded-lg bg-(--accent-main) px-2.5 py-1.5 text-xs font-medium text-(--bg-0) hover:opacity-90 cursor-pointer"
            >
              <Plus size={14} /> Добавить
            </button>
          </div>
          {chain.length === 0 && (
            <p className="text-xs text-(--ink-2)">
              Пусто — блок не отображается на странице книги.
            </p>
          )}
          <div className="space-y-2">
            {chain.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border border-(--ink-3) bg-(--bg-0) p-2.5"
              >
                <select
                  value={item.icon}
                  onChange={(e) => setChainItem(i, { icon: e.target.value })}
                  className="rounded-lg border border-(--ink-3) bg-(--bg-0) px-2 py-1.5 text-sm text-(--ink-0) outline-none"
                >
                  {[
                    ...new Set([
                      ...MATERIAL_SYMBOLS,
                      ...chain.map((c) => c.icon),
                    ]),
                  ].map((icon) => (
                    <option key={icon} value={icon}>
                      {ICON_LABELS[icon] ?? icon} ({icon})
                    </option>
                  ))}
                </select>
                <input
                  value={item.title}
                  onChange={(e) => setChainItem(i, { title: e.target.value })}
                  placeholder="Заголовок"
                  className="w-1/3 rounded-lg border border-(--ink-3) bg-(--bg-0) px-2 py-1.5 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
                />
                <input
                  value={item.text}
                  onChange={(e) => setChainItem(i, { text: e.target.value })}
                  placeholder="Текст"
                  className="flex-1 rounded-lg border border-(--ink-3) bg-(--bg-0) px-2 py-1.5 text-sm text-(--ink-0) outline-none focus:border-(--accent-main)"
                />
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveChain(i, -1)}
                    disabled={i === 0}
                    className="rounded p-1 text-(--ink-1) hover:bg-(--ink-3) hover:text-white disabled:opacity-30 cursor-pointer"
                    aria-label="Вверх"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => moveChain(i, 1)}
                    disabled={i === chain.length - 1}
                    className="rounded p-1 text-(--ink-1) hover:bg-(--ink-3) hover:text-white disabled:opacity-30 cursor-pointer"
                    aria-label="Вниз"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
                <button
                  onClick={() =>
                    setChain((c) => c.filter((_, idx) => idx !== i))
                  }
                  className="rounded p-1 text-red-400 hover:bg-red-500/10 cursor-pointer"
                  aria-label="Удалить"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {enrichResult && (
          <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            Обогащено из Google Books:{" "}
            {enrichResult.length > 0
              ? enrichResult.join(", ")
              : "изменений нет"}
          </p>
        )}

        <label className="mt-5 flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isTrending ?? book.isTrending ?? false}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, isTrending: e.target.checked }))
            }
            className="h-4 w-4 rounded accent-(--accent-main)"
          />
          <span className="text-sm text-(--ink-1)">
            В тренде недели (блок «Тренды» на /rankings)
          </span>
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-(--ink-3) pt-4">
          <button
            onClick={() => {
              // Битый JSON паспорта/профиля — не отправляем поле вовсе, чтобы
              // случайный мусор не затёр существующие данные в БД.
              const rest = { ...form };
              delete rest.readingGuide;
              delete rest.readingProfile;
              onSave({
                ...(guideError ? rest : profileError ? rest : form),
                tags: tagsInput
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
                contextChain: chain,
              });
            }}
            disabled={saving}
            className="rounded-lg bg-(--accent-main) px-4 py-2 text-sm font-semibold text-(--bg-0) hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
          {isPublished ? (
            <button
              onClick={onUnpublish}
              disabled={unpublishing}
              className="rounded-lg border border-amber-500/40 px-4 py-2 text-sm text-amber-300 hover:bg-amber-500/10 disabled:opacity-50 cursor-pointer"
            >
              {unpublishing ? "…" : "Вернуть в черновик"}
            </button>
          ) : (
            <button
              onClick={onPublish}
              disabled={publishing}
              className="rounded-lg border border-emerald-500/40 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50 cursor-pointer"
            >
              {publishing ? "…" : "Опубликовать"}
            </button>
          )}
          <button
            onClick={onEnrich}
            disabled={enriching}
            className="rounded-lg border border-(--ink-3) px-4 py-2 text-sm text-(--ink-0) hover:bg-(--ink-3) disabled:opacity-50 cursor-pointer"
          >
            {enriching ? "Обогащение…" : "Обогатить из Google Books"}
          </button>
          <button
            onClick={onMerge}
            className="ml-auto rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 cursor-pointer"
          >
            Склеить с дублем…
          </button>
        </div>
      </div>
    </div>
  );
}
