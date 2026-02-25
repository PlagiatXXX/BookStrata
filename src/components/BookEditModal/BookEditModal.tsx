import { useState, useEffect } from "react";
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

export const BookEditModal = ({
  isOpen,
  onClose,
  book,
  onSave,
}: BookEditModalProps) => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [thoughts, setThoughts] = useState("");

  useEffect(() => {
    if (book && isOpen) {
      logger.info("Модальное окно редактирования открыто", { 
        bookId: book.id, 
        bookTitle: book.title 
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(book.title);
      setAuthor(book.author);
      setDescription(book.description || "");
      setThoughts(book.thoughts || "");
    }
  }, [book, isOpen]);

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
      <div className="flex flex-col gap-4 w-full max-h-[90vh] flex-nowrap">
        {/* Заголовок - Название по центру */}
        <div className="flex justify-center shrink-0">
          <div className="flex flex-col gap-2 w-96">
            <label className="text-sm font-medium text-gray-300 text-center">
              Название
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3 py-2 bg-surface-dark border border-surface-border rounded text-white text-center text-2xl font-bold"
              placeholder="Название книги"
            />
          </div>
        </div>

        {/* Основной контент с прокруткой */}
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6">
          {/* Верхняя часть: Обложка слева, Автор и Описание справа */}
          <div className="flex gap-6">
            {/* Пустое место слева (где была бы обложка) */}
            <div className="w-40 h-56 shrink-0" />

            {/* Справа: Автор и Описание */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">
                  Автор
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="px-3 py-2 bg-surface-dark border border-surface-border rounded text-white"
                  placeholder="Автор книги"
                />
              </div>

              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <label className="text-sm font-medium text-gray-300">
                  Описание
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="px-3 py-2 bg-surface-dark border border-surface-border rounded text-white resize-none flex-1"
                  placeholder="Описание книги"
                />
              </div>
            </div>
          </div>

          {/* Нижняя часть: Мои мысли на всю ширину */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">
              Мои мысли
            </label>
            <textarea
              value={thoughts}
              onChange={(e) => setThoughts(e.target.value)}
              className="px-3 py-2 bg-surface-dark border border-surface-border rounded text-white resize-none"
              rows={5}
              placeholder="Ваши мысли о книге"
            />
          </div>
        </div>

        {/* Кнопки внизу */}
        <div className="flex justify-end gap-3 shrink-0">
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
