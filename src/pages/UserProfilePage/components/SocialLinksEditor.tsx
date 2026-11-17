import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { sileo } from "sileo";
import {
  PLATFORM_OPTIONS,
  getPlatformPlaceholder,
  normalizeSocialUrl,
} from "@/lib/socialLinks";
import type { SocialLink } from "@/lib/userApi";

const MAX_LINKS = 6;
const TOUCH_TARGET = { minHeight: 44 } as const;

interface SocialLinksEditorProps {
  /** Текущий список ссылок (контролируемый компонент). */
  value: SocialLink[];
  onChange: (links: SocialLink[]) => void;
  /** Вызывается только после успешной валидации с нормализованными ссылками. */
  onSave: (links: SocialLink[]) => void | Promise<void>;
  isSaving?: boolean;
  /** Подпись кнопки сохранения (ProfileBioEditor использует «Готово»). */
  saveLabel?: string;
  /** Если передан — показывается кнопка «Отмена». */
  onCancel?: () => void;
}

/**
 * Редактор соцсетей профиля (спека §6.6): платформа + ссылка + удаление,
 * лимит 6, валидация через normalizeSocialUrl, ошибки по строке.
 */
export function SocialLinksEditor({
  value,
  onChange,
  onSave,
  isSaving = false,
  saveLabel = "Сохранить",
  onCancel,
}: SocialLinksEditorProps) {
  const [invalid, setInvalid] = useState<Set<number>>(new Set());

  const clearInvalid = (index: number) => {
    setInvalid((prev) => {
      if (!prev.has(index)) return prev;
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleAdd = () => {
    if (value.length >= MAX_LINKS) {
      sileo.error({ title: "Максимум 6 ссылок", duration: 2000 });
      return;
    }
    onChange([...value, { platform: "telegram", url: "" }]);
  };

  const handleRemove = (index: number) => {
    clearInvalid(index);
    onChange(value.filter((_, i) => i !== index));
  };

  const handleChange = (
    index: number,
    field: keyof SocialLink,
    nextValue: string,
  ) => {
    clearInvalid(index);
    onChange(
      value.map((link, i) =>
        i === index ? { ...link, [field]: nextValue } : link,
      ),
    );
  };

  const handleSave = () => {
    const invalidIndexes = new Set<number>();
    const normalized: SocialLink[] = [];

    value.forEach((link, index) => {
      const trimmedUrl = link.url.trim();
      if (!trimmedUrl) return;
      const url = normalizeSocialUrl(trimmedUrl);
      if (!url) {
        invalidIndexes.add(index);
        return;
      }
      normalized.push({ platform: link.platform.trim(), url });
    });

    if (invalidIndexes.size > 0) {
      setInvalid(invalidIndexes);
      const firstInvalid = [...invalidIndexes][0];
      const example = getPlatformPlaceholder(
        value[firstInvalid]?.platform ?? "",
      );
      sileo.error({
        title: "Некорректная ссылка",
        description: `Это не похоже на ссылку. Пример: ${example}`,
        duration: 4000,
      });
      return;
    }

    setInvalid(new Set());
    void onSave(normalized);
  };

  const atLimit = value.length >= MAX_LINKS;

  return (
    <div className="social-links-editor" data-testid="social-links-editor">
      <div
        className="social-links-editor__header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 14,
        }}
      >
        <h2 className="h social-links-editor__heading" style={{ margin: 0 }}>
          Соцсети
        </h2>
        <span className="m social-links-editor__counter" aria-label="Количество ссылок">
          {value.length} из {MAX_LINKS}
        </span>
      </div>

      {value.length === 0 ? (
        <p className="m social-links-editor__empty" style={{ margin: "14px 0" }}>
          Пока нет добавленных ссылок
        </p>
      ) : (
        <div
          className="social-links-editor__rows"
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          {value.map((link, index) => {
            const isInvalid = invalid.has(index);
            const placeholder = getPlatformPlaceholder(link.platform);
            return (
              <div
                className="social-links-editor__row"
                key={index}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <select
                  aria-label="Платформа"
                  className="inp sel social-links-editor__select"
                  style={{ width: 140, ...TOUCH_TARGET }}
                  value={link.platform}
                  disabled={isSaving}
                  onChange={(e) => handleChange(index, "platform", e.target.value)}
                >
                  {PLATFORM_OPTIONS.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Ссылка"
                  aria-invalid={isInvalid}
                  className="inp social-links-editor__input"
                  style={{
                    flex: 1,
                    minWidth: 160,
                    borderColor: isInvalid ? "#f87171" : undefined,
                    ...TOUCH_TARGET,
                  }}
                  type="url"
                  value={link.url}
                  placeholder={placeholder}
                  disabled={isSaving}
                  onChange={(e) => handleChange(index, "url", e.target.value)}
                />
                <button
                  type="button"
                  aria-label="Удалить"
                  title="Удалить"
                  className="btn social-links-editor__remove"
                  style={{ padding: "0 14px", ...TOUCH_TARGET }}
                  disabled={isSaving}
                  onClick={() => handleRemove(index)}
                >
                  <Trash2 size={16} />
                </button>
                {isInvalid && (
                  <p
                    className="social-links-editor__error"
                    style={{ flexBasis: "100%", margin: 0, fontSize: 12, color: "#f87171" }}
                  >
                    Некорректная ссылка. Пример: {placeholder}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div
        className="social-links-editor__actions"
        style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}
      >
        <button
          type="button"
          className="btn social-links-editor__add"
          style={{ borderStyle: "dashed", ...TOUCH_TARGET }}
          disabled={atLimit || isSaving}
          onClick={handleAdd}
        >
          <Plus size={16} aria-hidden="true" />
          Добавить соцсеть
        </button>
        <button
          type="button"
          className="btn pri social-links-editor__save"
          style={TOUCH_TARGET}
          disabled={isSaving}
          onClick={handleSave}
        >
          {isSaving ? "Сохранение…" : saveLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn social-links-editor__cancel"
            style={TOUCH_TARGET}
            disabled={isSaving}
            onClick={onCancel}
          >
            Отмена
          </button>
        )}
      </div>
    </div>
  );
}
