import { useReducer, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Modal } from "@/ui/Modal";
import { Button } from "@/ui/Button";
import type { Book } from "@/types";
import { createLogger } from "@/lib/logger";
import { EditorConfirmModal } from "@/components/EditorModals/EditorConfirmModal";

const logger = createLogger("BookEditModal", { color: "cyan" });

interface BookEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  onSave: (
    bookId: string,
    data: {
      title?: string;
      author?: string;
      description?: string;
      thoughts?: string;
      coverImageUrl?: string;
    },
  ) => void;
}

interface BookFormState {
  title: string;
  author: string;
  description: string;
  thoughts: string;
  coverImageUrl: string;
}

type BookFormAction =
  | { type: "SET_BOOK"; book: Book }
  | { type: "RESET" }
  | { type: "SET_TITLE"; title: string }
  | { type: "SET_AUTHOR"; author: string }
  | { type: "SET_DESCRIPTION"; description: string }
  | { type: "SET_THOUGHTS"; thoughts: string }
  | { type: "SET_COVER_IMAGE_URL"; coverImageUrl: string };

function bookFormReducer(
  state: BookFormState,
  action: BookFormAction,
): BookFormState {
  switch (action.type) {
    case "SET_BOOK":
      return {
        title: action.book.title,
        author: action.book.author,
        description: action.book.description || "",
        thoughts: action.book.thoughts || "",
        coverImageUrl: action.book.coverImageUrl || "",
      };
    case "RESET":
      return {
        title: "",
        author: "",
        description: "",
        thoughts: "",
        coverImageUrl: "",
      };
    case "SET_TITLE":
      return { ...state, title: action.title };
    case "SET_AUTHOR":
      return { ...state, author: action.author };
    case "SET_DESCRIPTION":
      return { ...state, description: action.description };
    case "SET_THOUGHTS":
      return { ...state, thoughts: action.thoughts };
    case "SET_COVER_IMAGE_URL":
      return { ...state, coverImageUrl: action.coverImageUrl };
    default:
      return state;
  }
}

const INITIAL_STATE: BookFormState = {
  title: "",
  author: "",
  description: "",
  thoughts: "",
  coverImageUrl: "",
};

const sectionTitleClass =
  "mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#c1fffe]";

const inputClass =
  "w-full border-2 border-black bg-[#0a0a0a] px-4 py-3 text-sm text-[#f6f1e8] placeholder:text-[#676767] outline-none transition-colors focus:border-[#c1fffe]";

const textareaClass = `${inputClass} resize-none`;

export const BookEditModal = ({
  isOpen,
  onClose,
  book,
  onSave,
}: BookEditModalProps) => {
  const [state, dispatch] = useReducer(bookFormReducer, INITIAL_STATE);
  const [isCoverDeleteModalOpen, setIsCoverDeleteModalOpen] = useState(false);
  const { title, author, description, thoughts, coverImageUrl } = state;

  const handleClose = () => {
    dispatch({ type: "RESET" });
    setIsCoverDeleteModalOpen(false);
    onClose();
  };

  useEffect(() => {
    if (book && isOpen) {
      logger.info("Book edit modal opened", {
        bookId: book.id,
        bookTitle: book.title,
      });
      dispatch({ type: "SET_BOOK", book });
    }
  }, [book, isOpen]);

  const handleSave = () => {
    logger.info("Book edit modal save clicked", {
      bookId: book?.id,
      newTitle: title.trim(),
    });

    if (!book) return;

    onSave(book.id, {
      title: title.trim(),
      author: author.trim(),
      description: description.trim() || undefined,
      thoughts: thoughts.trim() || undefined,
      coverImageUrl,
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="2xl"
      titleId="book-edit-title"
    >
      <div
        className="relative flex max-h-[90vh] w-full flex-col overflow-hidden bg-[#111111] text-[#f6f1e8]"
        onKeyDown={handleKeyDown}
      >
        <button
          onClick={handleClose}
          className="absolute right-5 top-5 z-20 flex size-10 cursor-pointer items-center justify-center border-2 border-black bg-[#0a0a0a] text-[#9aa1a3] transition-colors hover:border-[#c1fffe] hover:text-[#f6f1e8] focus-visible:ring-2 focus-visible:ring-pink-500 outline-none"
          title="Закрыть"
          aria-label="Закрыть модальное окно"
        >
          <X size={18} />
        </button>

        <div className="border-b-2 border-black bg-[#181818] px-6 py-5">
          <div className="pr-14">
            <p
              id="book-edit-title"
              className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#c1fffe]"
            >
              Редактирование книги
            </p>
            <label
              htmlFor="book-title-input"
              className="mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#9aa1a3]"
            >
              Название <span className="text-pink-500" aria-hidden="true">*</span>
            </label>
            <input
              id="book-title-input"
              type="text"
              value={title}
              onChange={(e) =>
                dispatch({ type: "SET_TITLE", title: e.target.value })
              }
              autoFocus
              maxLength={100}
              className="w-full border-2 border-black bg-[#0a0a0a] px-5 py-4 text-xl font-black tracking-[-0.03em] text-[#f6f1e8] placeholder:text-[#5e5e5e] outline-none transition-colors focus:border-[#c1fffe] focus-visible:ring-2 focus-visible:ring-cyan-400 max-md:text-lg"
              placeholder="Введите название книги"
              aria-label="Название книги"
            />
            <span className="mt-1 block text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              {title.length}/100
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#111111] p-6">
          <div className="flex flex-col gap-6">
            <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
              <section className="border-2 border-black bg-[#171717] p-3">
                <p className={`${sectionTitleClass} text-center`}>Обложка</p>
                <div className="mx-auto h-64 w-40 overflow-hidden border-2 border-black bg-[#0a0a0a] max-sm:h-56">
                  {coverImageUrl ? (
                    <img
                      src={coverImageUrl}
                      alt={(book?.title ?? title) || "Обложка книги"}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src =
                          "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='224'><rect fill='%23333' width='160' height='224'/><text fill='%23666' x='50%' y='50%' text-anchor='middle' dominant-baseline='middle'>Нет обложки</text></svg>";
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#6b6b6b]">
                      <span className="text-sm">Нет обложки</span>
                    </div>
                  )}
                </div>
                {coverImageUrl ? (
                  <button
                    type="button"
                    onClick={() => setIsCoverDeleteModalOpen(true)}
                    className="mt-3 w-full cursor-pointer border-2 border-black bg-[#0a0a0a] px-3 py-2 text-sm font-semibold text-[#ff9db7] transition-colors hover:border-[#ff5c8a] hover:bg-[#171717] hover:text-[#ffd4df] focus-visible:ring-2 focus-visible:ring-pink-500 outline-none"
                    aria-label="Удалить текущую обложку"
                  >
                    Удалить обложку
                  </button>
                ) : null}
              </section>

              <div className="grid gap-6">
                <section className="border-2 border-black bg-[#171717] p-4">
                  <label
                    htmlFor="book-author-input"
                    className={sectionTitleClass}
                  >
                    Автор
                  </label>
                  <input
                    id="book-author-input"
                    type="text"
                    value={author}
                    onChange={(e) =>
                      dispatch({ type: "SET_AUTHOR", author: e.target.value })
                    }
                    maxLength={100}
                    className={`${inputClass} focus-visible:ring-2 focus-visible:ring-cyan-400`}
                    placeholder="Автор книги"
                    aria-label="Автор книги"
                  />
                  <span className="mt-1 block text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {author.length}/100
                  </span>
                </section>

                <section className="border-2 border-black bg-[#171717] p-4">
                  <label
                    htmlFor="book-description-input"
                    className={sectionTitleClass}
                  >
                    Описание
                  </label>
                  <textarea
                    id="book-description-input"
                    value={description}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_DESCRIPTION",
                        description: e.target.value,
                      })
                    }
                    className={`${textareaClass} min-h-40 focus-visible:ring-2 focus-visible:ring-cyan-400`}
                    placeholder="Краткое описание книги"
                    aria-label="Описание книги"
                  />
                </section>
              </div>
            </div>

            <section className="border-2 border-black bg-[#171717] p-4">
              <label
                htmlFor="book-thoughts-input"
                className={sectionTitleClass}
              >
                Мои мысли
              </label>
              <textarea
                id="book-thoughts-input"
                value={thoughts}
                onChange={(e) =>
                  dispatch({ type: "SET_THOUGHTS", thoughts: e.target.value })
                }
                className={`${textareaClass} min-h-36 focus-visible:ring-2 focus-visible:ring-cyan-400`}
                rows={5}
                placeholder="Ваши мысли, заметки и впечатления о книге"
                aria-label="Ваши мысли о книге"
              />
            </section>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t-2 border-black bg-[#0a0a0a] px-6 py-5 max-md:flex-col-reverse">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="border-2 border-black bg-transparent px-6 py-3 font-semibold text-[#b4b4b4] hover:border-[#c1fffe] hover:bg-[#171717] hover:text-[#f6f1e8] max-md:w-full focus-visible:ring-2 focus-visible:ring-pink-500"
            aria-label="Отменить изменения и закрыть"
          >
            Отмена
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            className="border-2 border-black bg-[#c1fffe] px-6 py-3 font-black text-black hover:bg-[#9cf5f3] hover:text-black max-md:w-full focus-visible:ring-2 focus-visible:ring-pink-500"
            title="Ctrl + Enter"
            aria-label="Сохранить изменения (Ctrl + Enter)"
            aria-keyshortcuts="Control+Enter"
          >
            <span>Сохранить</span>
            <kbd className="ml-2 hidden text-[10px] font-normal opacity-60 lg:inline-block">
              Ctrl + Enter
            </kbd>
          </Button>
        </div>
      </div>

      <EditorConfirmModal
        isOpen={isCoverDeleteModalOpen}
        onClose={() => setIsCoverDeleteModalOpen(false)}
        onConfirm={() => {
          dispatch({ type: "SET_COVER_IMAGE_URL", coverImageUrl: "" });
          setIsCoverDeleteModalOpen(false);
        }}
        title="Удалить обложку?"
        titleId="delete-cover-title"
        confirmLabel="Удалить"
        description={
          <>
            <p>Обложка будет удалена из книги после сохранения изменений.</p>
            <p className="mt-3">Это поможет избежать случайного удаления.</p>
          </>
        }
      />
    </Modal>
  );
};
