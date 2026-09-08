// src/pages/AdminBooksPage/components/BookEditModal.tsx
// Редактор книги (Фаза 7): поля SEO-карточки, slug с историей, статус
// (publish через инвариант полноты), обогащение из Google Books, merge,
// редактор contextChain ({ icon, title, text }) с иконками Material Symbols.
import { useRef, useState } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2, X, Upload } from "lucide-react";
import type {
  AdminBookDetail,
  BookUpdateInput,
  ContextChainItem,
  ReadingGuide,
  ReadingProfile,
} from "@/lib/adminBooksApi";
import { uploadBookCover } from "@/lib/adminBooksApi";
import { ReadingProfilePrompt } from "./ReadingProfilePrompt";
import { ReadingGuidePrompt } from "./ReadingGuidePrompt";

/** Обязательные ключи AI-паспорта (для клиентской проверки поля в модалке).
 *  Полную zod-валидацию делает бэкенд при PATCH. */
const GUIDE_REQUIRED_KEYS = [
  "short_hook",
  "target_audience",
  "not_recommended_for",
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
    "storyFocus", "emotionalWeight", "pace", "darkness", "confidence", "source",
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
            placeholder={`{\n  "short_hook": "Суть книги одним предложением",\n  "target_audience": "Кому понравится",\n  "not_recommended_for": "Кому пропустить",\n  "reading_pace": "Динамичный | Размеренный | Медитативный",\n  "difficulty": "Легкое чтение | Средняя сложность | Высокий порог входа",\n  "vibe": "Настроение",\n  "key_takeaways": ["Тезис 1", "Тезис 2", "Тезис 3"]\n}`}
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
          <div className="mb-1 flex items-center justify-between">
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
            placeholder={`{\n  "storyFocus": 25,      // 0=сюжет, 100=рефлексия\n  "emotionalWeight": 20, // 0=легко, 100=тяжело\n  "pace": 30,            // 0=быстро, 100=погружение\n  "darkness": 15,        // 0=светло, 100=мрачно\n  "confidence": {\n    "storyFocus": 0.95,\n    "emotionalWeight": 0.95,\n    "pace": 0.9,\n    "darkness": 0.95\n  },\n  "source": "ai" | "manual" | "calibrated"\n}`}
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
            Reading DNA книги: 4 оси (0–100) + confidence (0–1) + source.
            Используйте AI-промпт или заполните вручную. Пустое поле снимает профиль.
          </p>

          {/* Шпаргалка-промпт для AI-генерации */}
          <ReadingProfilePrompt
            bookTitle={book.title}
            bookAuthor={book.author}
            genre={book.genre}
            tags={book.tags}
            description={book.description}
          />
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
