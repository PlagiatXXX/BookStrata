import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { sileo } from "sileo";
import { ListPlus, Plus, X } from "lucide-react";
import { Modal } from "@/ui/Modal";
import { Button } from "@/ui/Button";
import {
  addBooksToTierList,
  createTierList,
  fetchAllMyTierLists,
} from "@/lib/tierListApi";
import type { Book } from "@/types";

interface CreateTierListModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Книги, которые попадут в тир-лист */
  books: Book[];
  /** Название нового тир-листа по умолчанию */
  defaultTitle: string;
}

type Mode = "new" | "existing";

/** Данные книги в формате POST /tier-lists/:id/books */
function toAddPayload(books: Book[]) {
  return books
    .filter((b) => b.title)
    .map((b) => ({
      title: b.title,
      author: b.author || undefined,
      coverImageUrl: b.coverImageUrl || "",
      description: b.description || null,
      thoughts: null as string | null,
    }));
}

/** Модалка «создать тир-лист из книг полки»: новый или в существующий */
export function CreateTierListModal({
  isOpen,
  onClose,
  books,
  defaultTitle,
}: CreateTierListModalProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("new");
  const [title, setTitle] = useState("");
  const [selectedId, setSelectedId] = useState("");

  // Все свои тир-листы — для выбора «в существующий»
  const { data: myTierLists = [], isLoading: isListsLoading } = useQuery({
    queryKey: ["my-tier-lists"],
    queryFn: fetchAllMyTierLists,
    enabled: isOpen,
    staleTime: 30_000,
  });

  const payload = useMemo(() => toAddPayload(books), [books]);

  // Создать новый тир-лист с книгами и открыть редактор
  const createMutation = useMutation({
    mutationFn: async () => {
      const tierList = await createTierList(title.trim() || defaultTitle);
      await addBooksToTierList(tierList.id, payload);
      return tierList;
    },
    onSuccess: (tierList) => {
      navigate(`/tier-lists/${tierList.id}`);
    },
    onError: () => {
      sileo.error({
        title: "Не удалось создать тир-лист",
        description: "Попробуйте ещё раз",
        duration: 4000,
      });
    },
  });

  // Добавить книги в существующий тир-лист
  const addMutation = useMutation({
    mutationFn: (tierListId: string) => addBooksToTierList(tierListId, payload),
    onSuccess: (_result, tierListId) => {
      const target = myTierLists.find((tl) => tl.id === tierListId);
      sileo.success({
        title: "Книги добавлены",
        description: `В тир-лист «${target?.title ?? ""}» добавлено книг: ${payload.length}`,
        duration: 4000,
      });
      onClose();
    },
    onError: () => {
      sileo.error({
        title: "Не удалось добавить книги",
        description: "Попробуйте ещё раз",
        duration: 4000,
      });
    },
  });

  const isBusy = createMutation.isPending || addMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md" titleId="create-tier-list-modal-title">
      <div className="relative bg-[#111111]/95 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
        <button
          onClick={onClose}
          disabled={isBusy}
          className="absolute top-4 right-4 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/20 text-slate-400 hover:text-white transition-colors"
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>

        <div className="p-6">
          <h3 className="text-xl font-bold text-[#f6f1e8] mb-1" id="create-tier-list-modal-title">
            Тир-лист из {books.length} книг
          </h3>
          <p className="text-sm text-slate-400 mb-5">Куда добавить книги с полки?</p>

          {/* Выбор режима */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors cursor-pointer ${
                mode === "new"
                  ? "border-[#c1fffe]/60 bg-[#c1fffe]/10 text-[#c1fffe]"
                  : "border-slate-700/50 text-slate-400 hover:bg-slate-800/40"
              }`}
            >
              <Plus size={16} /> Новый тир-лист
            </button>
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors cursor-pointer ${
                mode === "existing"
                  ? "border-[#c1fffe]/60 bg-[#c1fffe]/10 text-[#c1fffe]"
                  : "border-slate-700/50 text-slate-400 hover:bg-slate-800/40"
              }`}
            >
              <ListPlus size={16} /> В существующий
            </button>
          </div>

          {mode === "new" ? (
            <div>
              <label htmlFor="new-tier-list-title" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Название
              </label>
              <input
                id="new-tier-list-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="w-full rounded-lg border border-slate-700/60 bg-black/30 px-3 py-2 text-sm text-[#f6f1e8] outline-none focus:border-[#c1fffe]/60"
                placeholder="Название тир-листа"
              />
              <Button
                variant="primary"
                onClick={() => createMutation.mutate()}
                disabled={isBusy || payload.length === 0}
                className="mt-4 w-full bg-[#c1fffe] text-black py-2 text-sm font-bold hover:bg-[#9cf5f3]"
              >
                {createMutation.isPending ? "Создаём…" : "Создать и открыть"}
              </Button>
            </div>
          ) : (
            <div>
              <label htmlFor="existing-tier-list-select" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Тир-лист
              </label>
              {isListsLoading ? (
                <p className="text-sm text-slate-500 py-2">Загружаем ваши тир-листы…</p>
              ) : myTierLists.length === 0 ? (
                <p className="text-sm text-slate-500 py-2">
                  У вас пока нет тир-листов — создайте новый.
                </p>
              ) : (
                <select
                  id="existing-tier-list-select"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700/60 bg-black/30 px-3 py-2 text-sm text-[#f6f1e8] outline-none focus:border-[#c1fffe]/60"
                >
                  <option value="" disabled>
                    Выберите тир-лист…
                  </option>
                  {myTierLists.map((tl) => (
                    <option key={tl.id} value={tl.id}>
                      {tl.title}
                    </option>
                  ))}
                </select>
              )}
              <Button
                variant="primary"
                onClick={() => selectedId && addMutation.mutate(selectedId)}
                disabled={isBusy || !selectedId || payload.length === 0}
                className="mt-4 w-full bg-[#c1fffe] text-black py-2 text-sm font-bold hover:bg-[#9cf5f3]"
              >
                {addMutation.isPending ? "Добавляем…" : "Добавить книги"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}