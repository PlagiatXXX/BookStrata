import { useReducer, useEffect } from "react";
import { X } from "lucide-react";
import { Modal } from "@/ui/Modal";
import { Button } from "@/ui/Button";
import type { Book } from "@/types";
import { logger } from "@/lib/logger";

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
    },
  ) => void;
}

interface BookFormState {
  title: string;
  author: string;
  description: string;
  thoughts: string;
}

type BookFormAction =
  | { type: 'SET_BOOK'; book: Book }
  | { type: 'RESET' }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_AUTHOR'; author: string }
  | { type: 'SET_DESCRIPTION'; description: string }
  | { type: 'SET_THOUGHTS'; thoughts: string };

function bookFormReducer(state: BookFormState, action: BookFormAction): BookFormState {
  switch (action.type) {
    case 'SET_BOOK':
      return {
        title: action.book.title,
        author: action.book.author,
        description: action.book.description || "",
        thoughts: action.book.thoughts || "",
      };
    case 'RESET':
      return {
        title: "",
        author: "",
        description: "",
        thoughts: "",
      };
    case 'SET_TITLE':
      return { ...state, title: action.title };
    case 'SET_AUTHOR':
      return { ...state, author: action.author };
    case 'SET_DESCRIPTION':
      return { ...state, description: action.description };
    case 'SET_THOUGHTS':
      return { ...state, thoughts: action.thoughts };
    default:
      return state;
  }
}

const INITIAL_STATE: BookFormState = {
  title: "",
  author: "",
  description: "",
  thoughts: "",
};

export const BookEditModal = ({
  isOpen,
  onClose,
  book,
  onSave,
}: BookEditModalProps) => {
  const [state, dispatch] = useReducer(bookFormReducer, INITIAL_STATE);
  const { title, author, description, thoughts } = state;

  useEffect(() => {
    if (book && isOpen) {
      logger.info("Модальное окно редактирования открыто", {
        bookId: book.id,
        bookTitle: book.title
      });
      dispatch({ type: 'SET_BOOK', book });
    } else if (!isOpen) {
      dispatch({ type: 'RESET' });
    }
  }, [book, isOpen]);

  const handleTitleChange = (value: string) => {
    dispatch({ type: 'SET_TITLE', title: value });
  };

  const handleAuthorChange = (value: string) => {
    dispatch({ type: 'SET_AUTHOR', author: value });
  };

  const handleDescriptionChange = (value: string) => {
    dispatch({ type: 'SET_DESCRIPTION', description: value });
  };

  const handleThoughtsChange = (value: string) => {
    dispatch({ type: 'SET_THOUGHTS', thoughts: value });
  };

  const handleSave = () => {
    logger.info("Пользователь нажал 'Сохранить' в модальном окне", {
      bookId: book?.id,
      newTitle: title.trim(), 
    });
    if (book) {
      onSave(book.id, {
        title: title.trim(),
        author: author.trim(),
        description: description.trim() || undefined,
        thoughts: thoughts.trim() || undefined,
      });
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} maxWidth="2xl">
      <div className="flex flex-col gap-6 w-full max-h-[90vh] p-8 max-md:p-3 max-sm:p-2 max-md:gap-4 max-sm:gap-3 relative">
        {/* Крестик закрытия в верхнем правом углу */}
        <button
          onClick={handleCancel}
          className="absolute right-4 top-4 z-20 p-2 text-gray-400 hover:text-white
                     rounded-lg hover:bg-surface-border
                     transition-all duration-200
                     max-md:right-2 max-md:top-2 max-md:p-1.5"
          title="Закрыть"
        >
          <X size={24} className="md:w-6 md:h-6 sm:w-5 sm:h-5" />
        </button>

        {/* Заголовок с неоновым эффектом */}
        <div className="shrink-0">
          <div className="flex flex-col gap-3 max-sm:gap-2">
            <label
              htmlFor="book-title-input"
              className="text-xs font-semibold text-cyan-400 uppercase tracking-wider text-center max-sm:text-[10px]"
            >
              Название книги
            </label>
            <input
              id="book-title-input"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="px-6 py-4 bg-linear-to-r from-surface-dark via-surface-dark to-surface-dark
                         border border-cyan-500/30 rounded-xl text-white text-center text-2xl font-bold
                         shadow-lg shadow-cyan-500/10
                         focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400
                         transition-all duration-200 placeholder:text-gray-600
                         max-md:text-lg max-md:px-4 max-md:py-3
                         max-sm:text-base max-sm:px-3 max-sm:py-2 max-sm:rounded-lg"
              placeholder="Введите название книги"
            />
          </div>
        </div>

        {/* Основной контент с прокруткой */}
        <div className="flex-1 overflow-y-auto -mx-2 flex flex-col gap-6 pr-2 max-md:gap-4 max-sm:gap-3 max-md:-mx-1 max-sm:-mx-0.5">
          {/* Верхняя часть: Обложка слева, Автор и Описание справа */}
          <div className="flex gap-6 max-md:flex-col max-md:gap-4 max-sm:gap-3">
            {/* Обложка книги слева с неоновой рамкой */}
            <div className="w-40 h-56 shrink-0 rounded-xl overflow-hidden
                            shadow-lg shadow-purple-500/20
                            bg-linear-to-br from-surface-dark to-surface-border
                            border border-purple-500/30
                            transition-all duration-200 hover:shadow-purple-500/30
                            max-md:w-full max-md:h-64 max-md:mx-auto
                            max-sm:h-48">
              {book?.coverImageUrl ? (
                <img
                  src={book.coverImageUrl}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="224"><rect fill="%23333" width="160" height="224"/><text fill="%23666" x="50%" y="50%" text-anchor="middle" dominant-baseline="middle">Нет обложки</text></svg>';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center
                                bg-linear-to-br from-surface-dark to-surface-border
                                text-gray-500">
                  <span className="text-sm">Нет обложки</span>
                </div>
              )}
            </div>

            {/* Справа: Автор и Описание */}
            <div className="flex-1 flex flex-col gap-5 min-w-0 max-md:gap-3 max-sm:gap-2">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="book-author-input"
                  className="text-xs font-semibold text-purple-400 uppercase tracking-wider max-sm:text-[10px]"
                >
                  Автор
                </label>
                <input
                  id="book-author-input"
                  type="text"
                  value={author}
                  onChange={(e) => handleAuthorChange(e.target.value)}
                  className="px-4 py-3 bg-surface-dark
                             border border-purple-500/30 rounded-lg text-white
                             shadow-md shadow-purple-500/5
                             focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400
                             transition-all duration-200 placeholder:text-gray-600
                             max-sm:px-3 max-sm:py-2 max-sm:text-sm"
                  placeholder="Автор книги"
                />
              </div>

              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <label
                  htmlFor="book-description-input"
                  className="text-xs font-semibold text-purple-400 uppercase tracking-wider max-sm:text-[10px]"
                >
                  Описание
                </label>
                <textarea
                  id="book-description-input"
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  className="px-4 py-3 bg-surface-dark
                             border border-purple-500/30 rounded-lg text-white resize-none flex-1 min-h-30
                             shadow-md shadow-purple-500/5
                             focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400
                             transition-all duration-200 placeholder:text-gray-600
                             max-sm:px-3 max-sm:py-2 max-sm:text-sm max-sm:min-h-20"
                  placeholder="Краткое описание книги"
                />
              </div>
            </div>
          </div>

          {/* Нижняя часть: Мои мысли на всю ширину */}
          <div className="flex flex-col gap-2 max-sm:gap-1.5">
            <label
              htmlFor="book-thoughts-input"
              className="text-xs font-semibold text-pink-400 uppercase tracking-wider max-sm:text-[10px]"
            >
              Мои мысли
            </label>
            <textarea
              id="book-thoughts-input"
              value={thoughts}
              onChange={(e) => handleThoughtsChange(e.target.value)}
              className="px-4 py-3 bg-surface-dark
                         border border-pink-500/30 rounded-lg text-white resize-none
                         shadow-md shadow-pink-500/5
                         focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400
                         transition-all duration-200 placeholder:text-gray-600
                         max-sm:px-3 max-sm:py-2 max-sm:text-sm max-sm:rows-3"
              rows={5}
              placeholder="Ваши мысли, заметки и впечатления о книге"
            />
          </div>
        </div>

        {/* Кнопки внизу с отступами и неоновым стилем */}
        <div className="flex justify-end gap-4 shrink-0 pt-6 mt-2 border-t border-surface-border max-md:flex-col-reverse max-md:gap-2 max-md:pt-4 max-sm:pt-3 max-sm:gap-1.5">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="px-6 py-2.5 rounded-lg font-medium
                       border border-gray-600 hover:border-gray-500
                       hover:bg-surface-dark
                       transition-all duration-200
                       max-md:w-full
                       max-sm:px-4 max-sm:py-2 max-sm:text-sm"
          >
            Отмена
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-lg font-semibold
                       bg-linear-to-r from-cyan-600 to-blue-600
                       hover:from-cyan-500 hover:to-blue-500
                       shadow-lg shadow-cyan-500/30
                       hover:shadow-cyan-500/50
                       transition-all duration-200
                       border border-cyan-400/30
                       max-md:w-full
                       max-sm:px-4 max-sm:py-2 max-sm:text-sm"
          >
            Сохранить
          </Button>
        </div>
      </div>
    </Modal>
  );
};
