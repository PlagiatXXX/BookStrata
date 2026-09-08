import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookEditModal } from "./BookEditModal";

const baseBook = {
  id: 1,
  title: "Дюна",
  author: "Герберт",
  slug: "dune",
  authorId: null,
  status: "published",
  genre: null,
  tags: [],
  description: "",
  coverImageUrl: "/c/dune.jpg",
  publishedYear: 1965,
  isbn: null,
  rating: null,
  likesCount: 0,
  isTrending: false,
  contextChain: null,
  readingGuide: null,
  source: null,
  externalId: null,
  mergedIntoId: null,
  publishedAt: null,
  slugHistory: [],
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  ownerUsername: null,
  tierListNames: [],
  _count: { comments: 0, placements: 0 },
  authorRel: null,
} as any;

describe("BookEditModal — isTrending", () => {
  it("отправляет isTrending при сохранении", () => {
    const onSave = vi.fn();
    render(
      <BookEditModal
        book={baseBook}
        saving={false}
        publishing={false}
        unpublishing={false}
        enriching={false}
        enrichResult={null}
        onSave={onSave}
        onPublish={vi.fn()}
        onUnpublish={vi.fn()}
        onEnrich={vi.fn()}
        onMerge={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /сохранить/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ isTrending: true }),
    );
  });

  it("отображает начальное значение isTrending из книги", () => {
    render(
      <BookEditModal
        book={{ ...baseBook, isTrending: true }}
        saving={false}
        publishing={false}
        unpublishing={false}
        enriching={false}
        enrichResult={null}
        onSave={vi.fn()}
        onPublish={vi.fn()}
        onUnpublish={vi.fn()}
        onEnrich={vi.fn()}
        onMerge={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox")).toBeChecked();
  });
});

describe("BookEditModal — rating", () => {
  const renderModal = (book: typeof baseBook, onSave = vi.fn()) =>
    render(
      <BookEditModal
        book={book}
        saving={false}
        publishing={false}
        unpublishing={false}
        enriching={false}
        enrichResult={null}
        onSave={onSave}
        onPublish={vi.fn()}
        onUnpublish={vi.fn()}
        onEnrich={vi.fn()}
        onMerge={vi.fn()}
        onClose={vi.fn()}
      />,
    );

  it("отображает начальный рейтинг книги", () => {
    renderModal({ ...baseBook, rating: 9.1 });
    expect(
      (screen.getByLabelText(/рейтинг каталога/i) as HTMLInputElement).value,
    ).toBe("9.1");
  });

  it("отправляет введённую оценку при сохранении", () => {
    const onSave = vi.fn();
    renderModal(baseBook, onSave);
    fireEvent.change(screen.getByLabelText(/рейтинг каталога/i), {
      target: { value: "8.7" },
    });
    fireEvent.click(screen.getByRole("button", { name: /сохранить/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 8.7 }),
    );
  });

  it("очищенное поле отправляет rating: null (сброс оценки)", () => {
    const onSave = vi.fn();
    renderModal({ ...baseBook, rating: 9.1 }, onSave);
    fireEvent.change(screen.getByLabelText(/рейтинг каталога/i), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /сохранить/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ rating: null }),
    );
  });
});

describe("BookEditModal — readingGuide", () => {
  const validGuideJson = JSON.stringify({
    short_hook: "Эпическая история пустынной планеты.",
    target_audience: "Любителям масштабной научной фантастики.",
    not_recommended_for: "Тем, кто не любит многотомные саги.",
    reading_pace: "Размеренный",
    difficulty: "Средняя сложность",
    vibe: "Мистика пустыни",
    key_takeaways: ["Экология", "Политика", "Мессианство"],
  });

  const renderModal = (onSave = vi.fn()) =>
    render(
      <BookEditModal
        book={baseBook}
        saving={false}
        publishing={false}
        unpublishing={false}
        enriching={false}
        enrichResult={null}
        onSave={onSave}
        onPublish={vi.fn()}
        onUnpublish={vi.fn()}
        onEnrich={vi.fn()}
        onMerge={vi.fn()}
        onClose={vi.fn()}
      />,
    );

  it("валидный JSON с markdown-обёрткой: pretty-print + объект в патче", () => {
    const onSave = vi.fn();
    renderModal(onSave);
    const field = screen.getByLabelText(
      /ai-паспорт/i,
    ) as HTMLTextAreaElement;
    fireEvent.change(field, {
      target: { value: "```json\n" + validGuideJson + "\n```" },
    });
    fireEvent.blur(field);
    // Обёртка срезана, JSON отформатирован
    expect(field.value.startsWith("{\n")).toBe(true);
    expect(field.value).not.toContain("```");
    expect(screen.getByText(/✓ заполнен/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /сохранить/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        readingGuide: expect.objectContaining({
          reading_pace: "Размеренный",
        }),
      }),
    );
  });

  it("битый JSON: ошибка, в патч паспорт не попадает (существующий не стирается)", () => {
    const onSave = vi.fn();
    renderModal(onSave);
    const field = screen.getByLabelText(/ai-паспорт/i);
    fireEvent.change(field, {
      target: { value: '{"short_hook": "не закрыл' },
    });
    fireEvent.blur(field);
    expect(
      screen.getByText(/невалидный json паспорта/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /сохранить/i }));
    // readingGuide отсутствует в патче: мусор не отправляется и не стирает
    // существующий паспорт книги в БД
    expect(onSave).toHaveBeenCalledWith(
      expect.not.objectContaining(
        expect.objectContaining({ readingGuide: expect.anything() }),
      ),
    );
  });

  it("пустое поле: readingGuide null в патче", () => {
    const onSave = vi.fn();
    renderModal(onSave);
    const field = screen.getByLabelText(/ai-паспорт/i);
    fireEvent.change(field, { target: { value: "" } });
    fireEvent.blur(field);
    fireEvent.click(screen.getByRole("button", { name: /сохранить/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ readingGuide: null }),
    );
  });

  it("существующий паспорт книги отображается в поле", () => {
    render(
      <BookEditModal
        book={{
          ...baseBook,
          readingGuide: JSON.parse(validGuideJson),
        }}
        saving={false}
        publishing={false}
        unpublishing={false}
        enriching={false}
        enrichResult={null}
        onSave={vi.fn()}
        onPublish={vi.fn()}
        onUnpublish={vi.fn()}
        onEnrich={vi.fn()}
        onMerge={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const field = screen.getByLabelText(/ai-паспорт/i);
    expect(field.textContent).toContain("short_hook");
    expect(screen.getByText(/✓ заполнен/i)).toBeInTheDocument();
  });
});
