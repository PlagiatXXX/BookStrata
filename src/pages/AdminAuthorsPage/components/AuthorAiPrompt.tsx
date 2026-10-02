// src/pages/AdminAuthorsPage/components/AuthorAiPrompt.tsx
// Сворачиваемый блок «AI-промпт для автора»: промпт под именем автора,
// копирование одним кликом и заливка JSON-ответа ИИ в форму редактора.
// Симметричен ReadingGuidePrompt (админка книг).
import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Sparkles, AlertCircle } from "lucide-react";
import { EditorConfirmModal } from "@/components/EditorModals/EditorConfirmModal";
import { buildAuthorAiPrompt, parseAuthorAiResponse } from "./authorAi";
import type { AuthorAiFill } from "./authorAi";

export const AUTHOR_AI_PROMPT_TEST_ID = "author-ai-prompt";

interface AuthorAiPromptProps {
  authorName: string;
  /** Есть ли заполненные поля — тогда перед заливкой спрашиваем подтверждение. */
  hasContent: boolean;
  onFill: (fill: AuthorAiFill) => void;
}

export function AuthorAiPrompt({ authorName, hasContent, onFill }: AuthorAiPromptProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Распарсенный ответ, ждущий подтверждения замены (null — модалка закрыта)
  const [pendingFill, setPendingFill] = useState<AuthorAiFill | null>(null);

  const prompt = buildAuthorAiPrompt(authorName);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFill = () => {
    let fill: AuthorAiFill;
    try {
      fill = parseAuthorAiResponse(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось разобрать ответ ИИ");
      return;
    }
    setError(null);
    // Непустая форма — подтверждаем замену модалкой, а не нативным confirm
    if (hasContent) {
      setPendingFill(fill);
      return;
    }
    onFill(fill);
  };

  const handleConfirm = () => {
    if (pendingFill) onFill(pendingFill);
    setPendingFill(null);
  };

  const inputClass =
    "w-full bg-white/5 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500";

  return (
    <div
      data-testid={AUTHOR_AI_PROMPT_TEST_ID}
      className="rounded-xl border border-gray-800 bg-white/5"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-white/5 transition-colors"
      >
        <Sparkles size={15} className="text-amber-400" />
        <span>AI-промпт для автора</span>
        <span className="ml-auto text-gray-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-800 px-4 py-4 space-y-4">
          {/* Готовый промпт + копирование */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-white">
                Готовый промпт (скопировать → вставить в ChatGPT/Claude)
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-amber-400 hover:bg-amber-400/10 transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={14} />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Копировать
                  </>
                )}
              </button>
            </div>
            <pre className="max-h-60 overflow-auto rounded-md border border-gray-800 bg-black/30 p-3 text-[11px] leading-relaxed text-gray-300 font-mono whitespace-pre-wrap">
              {prompt}
            </pre>
          </div>

          {/* Ответ ИИ → заливка в форму */}
          <div>
            <label htmlFor="author-ai-response" className="block text-xs font-semibold text-white mb-1.5">
              Ответ ИИ (JSON) → вставить сюда целиком
            </label>
            <textarea
              id="author-ai-response"
              value={response}
              onChange={(e) => {
                setResponse(e.target.value);
                if (error) setError(null);
              }}
              rows={6}
              placeholder={'{\n  "badge": "Классик",\n  "motto": "…",\n  "stats": [ … ]\n}'}
              className={`${inputClass} font-mono text-xs`}
            />
            {error && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-red-400">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleFill}
              disabled={response.trim() === ""}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-400/15 text-amber-400 border border-amber-400/40 hover:bg-amber-400/25 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles size={14} />
              Заполнить из ответа ИИ
            </button>
            <p className="mt-1.5 text-[11px] text-gray-500">
              Зальёт бейдж, девиз, манифест, «о траектории» и статистику. Источники
              статистики останутся видны под полем «Статистика» до сохранения.
            </p>
          </div>
        </div>
      )}

      {/* Подтверждение замены заполненных полей ответом ИИ */}
      <EditorConfirmModal
        isOpen={pendingFill !== null}
        onClose={() => setPendingFill(null)}
        onConfirm={handleConfirm}
        title="Заменить текущие значения?"
        titleId="author-ai-confirm-title"
        confirmLabel="Заменить"
        confirmVariant="primary"
        description={
          <p>
            Заполненные вручную поля (бейдж, девиз, манифест, описание автора и
            статистика) будут заменены ответом ИИ. Вернуть прежние значения можно
            только заново введя их вручную.
          </p>
        }
      />
    </div>
  );
}
