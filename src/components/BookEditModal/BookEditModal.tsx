import { useReducer, useEffect } from "react";
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
      <div className="flex flex-col gap-6 w-full max-h-[90vh]">
        {/* Заголовок */}
        <div className="flex justify-center shrink-0">
          <div className="flex flex-col gap-2 w-full max-w-2xl">
            <label htmlFor="book-title-input" className="text-sm font-medium text-gray-300 text-center">
              Название книги
            </label>
            <input
              id="book-title-input"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="px-4 py-3 bg-surface-dark border border-surface-border rounded-lg text-white text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Введите название книги"
            />
          </div>
        </div>

        {/* Основной контент с прокруткой */}
        <div className="flex-1 overflow-y-auto px-2 flex flex-col gap-6">
          {/* Верхняя часть: Обложка слева, Автор и Описание справа */}
          <div className="flex gap-6">
            {/* Обложка книги слева */}
            <div className="w-40 h-56 shrink-0 rounded-lg overflow-hidden shadow-lg bg-surface-dark border border-surface-border">
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
                <div className="w-full h-full flex items-center justify-center bg-surface-dark text-gray-500">
                  <span className="text-sm">Нет обложки</span>
                </div>
              )}
            </div>

            {/* Справа: Автор и Описание */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              <div className="flex flex-col gap-2">
                <label htmlFor="book-author-input" className="text-sm font-medium text-gray-300">
                  Автор
                </label>
                <input
                  id="book-author-input"
                  type="text"
                  value={author}
                  onChange={(e) => handleAuthorChange(e.target.value)}
                  className="px-3 py-2 bg-surface-dark border border-surface-border rounded text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Автор книги"
                />
              </div>

              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <label htmlFor="book-description-input" className="text-sm font-medium text-gray-300">
                  Описание
                </label>
                <textarea
                  id="book-description-input"
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  className="px-3 py-2 bg-surface-dark border border-surface-border rounded text-white resize-none flex-1 min-h-30 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Краткое описание книги"
                />
              </div>
            </div>
          </div>

          {/* Нижняя часть: Мои мысли на всю ширину */}
          <div className="flex flex-col gap-2">
            <label htmlFor="book-thoughts-input" className="text-sm font-medium text-gray-300">
              Мои мысли
            </label>
            <textarea
              id="book-thoughts-input"
              value={thoughts}
              onChange={(e) => handleThoughtsChange(e.target.value)}
              className="px-3 py-2 bg-surface-dark border border-surface-border rounded text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={5}
              placeholder="Ваши мысли, заметки и впечатления о книге"
            />
          </div>
        </div>

        {/* Кнопки внизу с отступами */}
        <div className="flex justify-end gap-3 shrink-0 pt-4 border-t border-surface-border">
          <Button variant="ghost" onClick={handleCancel}>
            Отмена
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Сохранить
          </Button>
        </div>
      </div>
    </Modal>
  );
};
