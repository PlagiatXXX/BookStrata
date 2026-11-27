import { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { BookCharactersEditor } from "./BookCharactersEditor";
import { validateBookCharacters } from "./charactersEditorUtils";
import { BookEditModal } from "./BookEditModal";
import type { AdminBookDetail, BookCharacterInput } from "@/lib/adminBooksApi";
import * as adminBooksApi from "@/lib/adminBooksApi";

vi.mock("@/lib/adminBooksApi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/adminBooksApi")>(
    "@/lib/adminBooksApi",
  );
  return {
    ...actual,
    searchAdminCharacters: vi.fn(),
  };
});

const mockedSearch = vi.mocked(adminBooksApi.searchAdminCharacters);

const baseProps = {
  bookTitle: "Дюна",
  bookAuthor: "Фрэнк Герберт",
  genre: "Научная фантастика",
  description: "Эпическая сага о пустынной планете Арракис.",
};

const makeChar = (
  overrides: Partial<BookCharacterInput> = {},
): BookCharacterInput => ({
  name: "Пол Атрейдес",
  aliases: [],
  universeSlug: null,
  role: "protagonist",
  summary: "Юный наследник дома Атрейдесов, прибывающий на планету Арракис.",
  traits: [],
  relations: [],
  ...overrides,
});

const baseModalBook: AdminBookDetail = {
  id: 1,
  title: "Дюна",
  author: "Фрэнк Герберт",
  slug: "dune",
  authorId: null,
  status: "published",
  genre: "Фантастика",
  tags: [],
  description: "Пустынная планета Арракис.",
  coverImageUrl: "/c/dune.jpg",
  publishedYear: 1965,
  isbn: null,
  rating: null,
  likesCount: 0,
  views: 0,
  isTrending: false,
  contextChain: null,
  readingGuide: null,
  readingProfile: null,
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
  characters: [],
};

function ControlledEditor({
  initial,
  onSpyChange,
}: {
  initial: BookCharacterInput[];
  onSpyChange?: (next: BookCharacterInput[]) => void;
}) {
  const [items, setItems] = useState(initial);
  return (
    <BookCharactersEditor
      {...baseProps}
      value={items}
      onChange={(next) => {
        setItems(next);
        onSpyChange?.(next);
      }}
    />
  );
}

describe("BookCharactersEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSearch.mockResolvedValue({ items: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("импортирует JSON-массив из ИИ с markdown-обёрткой и русскими ролями", () => {
    const onChange = vi.fn();
    render(
      <BookCharactersEditor {...baseProps} value={[]} onChange={onChange} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /вставить json из ии/i }),
    );

    const jsonInput = screen.getByLabelText(/json персонажей из ии/i);
    const aiPayload = [
      "Вот список персонажей:",
      "```json",
      JSON.stringify([
        {
          name: "Пол Атрейдес",
          aliases: ["Муад'Диб"],
          universeSlug: "dune",
          role: "главный герой",
          traits: ["проницательный", "лидер"],
          summary:
            "Наследник герцога Лето, вынужденный выживать среди песков Арракиса.",
          relations: [{ targetName: "Леди Джессика", label: "мать" }],
        },
        {
          name: "Барон Владимир Харконнен",
          aliases: [],
          universeSlug: "",
          role: "антагонист",
          traits: ["жестокий", "хитрый"],
          summary:
            "Глава враждебного дома Харконненов, стремящийся уничтожить Атрейдесов.",
          relations: [],
        },
      ]),
      "```",
    ].join("\n");

    fireEvent.change(jsonInput, { target: { value: aiPayload } });
    fireEvent.click(screen.getByRole("button", { name: /применить json/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const imported = onChange.mock.calls[0][0] as BookCharacterInput[];
    expect(imported).toHaveLength(2);
    expect(imported[0]).toEqual({
      name: "Пол Атрейдес",
      aliases: ["Муад'Диб"],
      universeSlug: "dune",
      role: "protagonist",
      traits: ["проницательный", "лидер"],
      summary:
        "Наследник герцога Лето, вынужденный выживать среди песков Арракиса.",
      relations: [{ targetName: "Леди Джессика", label: "мать" }],
    });
    expect(imported[1].role).toBe("antagonist");
    expect(imported[1].universeSlug).toBeNull();
  });

  it("показывает ошибку при невалидном JSON при импорте и не вызывает onChange", () => {
    const onChange = vi.fn();
    render(
      <BookCharactersEditor {...baseProps} value={[]} onChange={onChange} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /вставить json из ии/i }),
    );
    fireEvent.change(screen.getByLabelText(/json персонажей из ии/i), {
      target: { value: "{ invalid json" },
    });
    fireEvent.click(screen.getByRole("button", { name: /применить json/i }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/невалидный json/i)).toBeInTheDocument();
  });

  it("добавляет нового героя вручную, меняет порядок (▲ / ▼) и удаляет", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <BookCharactersEditor {...baseProps} value={[]} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /\+ добавить героя/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const added = onChange.mock.calls[0][0] as BookCharacterInput[];
    expect(added).toHaveLength(1);
    expect(added[0].name).toBe("");
    expect(added[0].role).toBe("supporting");

    onChange.mockClear();
    const first = makeChar({ name: "Пол Атрейдес" });
    const second = makeChar({ name: "Леди Джессика", role: "supporting" });
    rerender(
      <BookCharactersEditor
        {...baseProps}
        value={[first, second]}
        onChange={onChange}
      />,
    );

    const downButtons = screen.getAllByRole("button", {
      name: /переместить вниз/i,
    });
    fireEvent.click(downButtons[0]);
    expect(onChange).toHaveBeenLastCalledWith([second, first]);

    const upButtons = screen.getAllByRole("button", {
      name: /переместить вверх/i,
    });
    fireEvent.click(upButtons[1]);
    expect(onChange).toHaveBeenLastCalledWith([second, first]);

    const deleteButtons = screen.getAllByRole("button", {
      name: /удалить героя/i,
    });
    fireEvent.click(deleteButtons[0]);
    expect(onChange).toHaveBeenLastCalledWith([second]);
  });

  it("сохраняет локальный ввод при переупорядочивании ▲ / ▼ благодаря стабильным ключам", () => {
    const first = makeChar({ name: "Пол Атрейдес" });
    const second = makeChar({ name: "Леди Джессика", role: "supporting" });

    render(<ControlledEditor initial={[first, second]} />);

    // Вводим черновик типа связи во вторую карточку
    const relLabelInputs = screen.getAllByLabelText(
      /тип связи/i,
    ) as HTMLInputElement[];
    fireEvent.change(relLabelInputs[1], { target: { value: "наставница" } });

    // Поднимаем вторую карточку наверх (▲)
    const upButtons = screen.getAllByRole("button", {
      name: /переместить вверх/i,
    });
    fireEvent.click(upButtons[1]);

    // После переупорядочивания черновик остался у первой (ранее второй) карточки
    const afterInputs = screen.getAllByLabelText(
      /тип связи/i,
    ) as HTMLInputElement[];
    expect(afterInputs[0].value).toBe("наставница");
    expect(afterInputs[1].value).toBe("");
  });

  it("добавляет и удаляет связь между двумя героями", () => {
    const onChange = vi.fn();
    const char1 = makeChar({ name: "Пол Атрейдес", relations: [] });
    const char2 = makeChar({ name: "Леди Джессика", role: "supporting" });

    const { rerender } = render(
      <BookCharactersEditor
        {...baseProps}
        value={[char1, char2]}
        onChange={onChange}
      />,
    );

    const targetSelects = screen.getAllByLabelText(/связанный персонаж/i);
    const labelInputs = screen.getAllByLabelText(/тип связи/i);
    const addRelButtons = screen.getAllByRole("button", {
      name: /добавить связь/i,
    });

    fireEvent.change(targetSelects[0], { target: { value: "Леди Джессика" } });
    fireEvent.change(labelInputs[0], { target: { value: "мать" } });
    fireEvent.click(addRelButtons[0]);

    expect(onChange).toHaveBeenCalledWith([
      {
        ...char1,
        relations: [{ targetName: "Леди Джессика", label: "мать" }],
      },
      char2,
    ]);

    onChange.mockClear();
    const char1WithRel = {
      ...char1,
      relations: [{ targetName: "Леди Джессика", label: "мать" }],
    };
    rerender(
      <BookCharactersEditor
        {...baseProps}
        value={[char1WithRel, char2]}
        onChange={onChange}
      />,
    );

    expect(screen.getByText(/мать: Леди Джессика/)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /удалить связь с леди джессика/i }),
    );
    expect(onChange).toHaveBeenCalledWith([
      { ...char1, relations: [] },
      char2,
    ]);
  });

  it("обновляет и очищает targetName в связях при переименовании и удалении героя", () => {
    const onSpyChange = vi.fn();
    const char1 = makeChar({
      name: "Пол Атрейдес",
      relations: [{ targetName: "Леди Джессика", label: "мать" }],
    });
    const char2 = makeChar({ name: "Леди Джессика", role: "supporting" });

    render(
      <ControlledEditor
        initial={[char1, char2]}
        onSpyChange={onSpyChange}
      />,
    );

    // Переименовываем второго героя
    const nameInputs = screen.getAllByLabelText(/имя персонажа/i);
    fireEvent.change(nameInputs[1], { target: { value: "Джессика" } });

    expect(screen.getByText(/мать: Джессика/)).toBeInTheDocument();
    expect(onSpyChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        relations: [{ targetName: "Джессика", label: "мать" }],
      }),
      expect.objectContaining({ name: "Джессика" }),
    ]);

    // Удаляем второго героя — ссылка в связях первого очищается
    const deleteButtons = screen.getAllByRole("button", {
      name: /удалить героя/i,
    });
    fireEvent.click(deleteButtons[1]);

    expect(screen.queryByText(/мать: Джессика/)).not.toBeInTheDocument();
    expect(onSpyChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ relations: [] }),
    ]);
  });

  it("сохраняет промежуточный ввод с запятой в CsvInput и нормализует при blur", () => {
    const onSpyChange = vi.fn();
    render(<ControlledEditor initial={[makeChar()]} onSpyChange={onSpyChange} />);

    const aliasesInput = screen.getByLabelText(
      /алиасы \/ переводы/i,
    ) as HTMLInputElement;

    fireEvent.change(aliasesInput, { target: { value: "первый, " } });
    expect(aliasesInput.value).toBe("первый, ");
    expect(onSpyChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ aliases: ["первый"] }),
    ]);

    fireEvent.change(aliasesInput, { target: { value: "первый, второй" } });
    fireEvent.blur(aliasesInput);

    expect(aliasesInput.value).toBe("первый, второй");
    expect(onSpyChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ aliases: ["первый", "второй"] }),
    ]);

    // Проверка обрезки сверх maxItems=5 в чертах характера после blur
    const traitsInput = screen.getByLabelText(
      /черты характера/i,
    ) as HTMLInputElement;
    fireEvent.change(traitsInput, {
      target: { value: "1, 2, 3, 4, 5, 6" },
    });
    fireEvent.blur(traitsInput);
    expect(traitsInput.value).toBe("1, 2, 3, 4, 5");
  });

  it("ищет существующих персонажей через searchAdminCharacters с debounce, закрывает список по Escape и привязывает characterId", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    mockedSearch.mockResolvedValue({
      items: [
        {
          id: 42,
          slug: "geralt",
          name: "Геральт из Ривии",
          aliases: ["Белый Волк", "Мясник из Блавикена"],
          universeSlug: "witcher",
          traits: ["ведьмак", "мутант"],
          bookCount: 7,
        },
      ],
    });

    const initial = makeChar({
      name: "",
      aliases: ["Гвинблейд"],
      traits: [],
    });

    const { rerender } = render(
      <BookCharactersEditor
        {...baseProps}
        value={[initial]}
        onChange={onChange}
      />,
    );

    const nameInput = screen.getByLabelText(/имя персонажа/i);
    fireEvent.change(nameInput, { target: { value: "Геральт" } });

    expect(mockedSearch).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockedSearch).toHaveBeenCalledWith("Геральт");

    const updated = { ...initial, name: "Геральт" };
    rerender(
      <BookCharactersEditor
        {...baseProps}
        value={[updated]}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(nameInput).toHaveAttribute("aria-expanded", "true");

    // Закрытие по Escape
    fireEvent.keyDown(nameInput, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(nameInput).toHaveAttribute("aria-expanded", "false");

    // Повторно вводим запрос для выбора из подсказки
    fireEvent.change(nameInput, { target: { value: "Геральт из" } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    const suggestionBtn = screen.getByRole("option", {
      name: /геральт из ривии/i,
    });
    fireEvent.click(suggestionBtn);

    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        characterId: 42,
        name: "Геральт из Ривии",
        universeSlug: "witcher",
        aliases: ["Гвинблейд", "Белый Волк", "Мясник из Блавикена"],
        traits: ["ведьмак", "мутант"],
      }),
    ]);

    rerender(
      <BookCharactersEditor
        {...baseProps}
        value={[
          {
            ...updated,
            characterId: 42,
            name: "Геральт из Ривии",
          },
        ]}
        onChange={onChange}
      />,
    );

    expect(screen.getByText("ID #42")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /отвязать персонажа/i }),
    );
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        characterId: undefined,
      }),
    ]);
  });
});

describe("validateBookCharacters", () => {
  it("возвращает null для валидного списка", () => {
    expect(validateBookCharacters([makeChar()])).toBeNull();
    expect(validateBookCharacters([])).toBeNull();
  });

  it("проверяет имя, длину описания, universeSlug, связи и граничные лимиты", () => {
    expect(validateBookCharacters([makeChar({ name: "   " })])).toMatch(
      /имя/i,
    );
    expect(
      validateBookCharacters([makeChar({ name: "А".repeat(121) })]),
    ).toMatch(/120/);
    expect(validateBookCharacters([makeChar({ summary: "Коротко" })])).toMatch(
      /описание/i,
    );
    expect(
      validateBookCharacters([makeChar({ universeSlug: "Invalid Slug!" })]),
    ).toMatch(/slug/i);
    expect(
      validateBookCharacters([
        makeChar({ relations: [{ targetName: "Кто-то", label: "" }] }),
      ]),
    ).toMatch(/связ/i);

    // Граничные проверки
    expect(
      validateBookCharacters(Array.from({ length: 21 }, () => makeChar())),
    ).toMatch(/максимум 20/i);
    expect(
      validateBookCharacters([
        makeChar({ aliases: Array.from({ length: 9 }, (_, i) => `а${i}`) }),
      ]),
    ).toMatch(/не более 8 алиас/i);
    expect(
      validateBookCharacters([makeChar({ aliases: ["Б".repeat(121)] })]),
    ).toMatch(/120/);
    expect(
      validateBookCharacters([
        makeChar({ traits: Array.from({ length: 6 }, (_, i) => `ч${i}`) }),
      ]),
    ).toMatch(/не более 5 черт/i);
    expect(
      validateBookCharacters([makeChar({ traits: ["В".repeat(41)] })]),
    ).toMatch(/40/);
    expect(
      validateBookCharacters([
        makeChar({
          relations: Array.from({ length: 11 }, (_, i) => ({
            targetName: `Герой ${i}`,
            label: "друг",
          })),
        }),
      ]),
    ).toMatch(/не более 10 связ/i);
    expect(
      validateBookCharacters([
        makeChar({
          relations: [{ targetName: "Кто-то", label: "Г".repeat(61) }],
        }),
      ]),
    ).toMatch(/60/);
  });
});

describe("BookEditModal — интеграция персонажей", () => {
  it("блокирует сохранение при невалидных персонажах и сбрасывает charactersDirty после успешного сохранения", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <BookEditModal
        book={baseModalBook}
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

    // Добавляем пустого героя → невалидно
    fireEvent.click(screen.getByRole("button", { name: /\+ добавить героя/i }));
    fireEvent.click(screen.getByRole("button", { name: /сохранить/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/укажите имя/i)).toBeInTheDocument();

    // Заполняем валидные данные
    fireEvent.change(screen.getByLabelText(/имя персонажа/i), {
      target: { value: "Пол Атрейдес" },
    });
    fireEvent.change(screen.getByLabelText(/описание персонажа/i), {
      target: {
        value:
          "Наследник дома Атрейдесов, отправляющийся на пустынную планету Арракис.",
      },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /сохранить/i }));
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    expect(onSave.mock.calls[0][1]).toEqual([
      expect.objectContaining({
        name: "Пол Атрейдес",
        sortOrder: 0,
      }),
    ]);

    // После успешного сохранения charactersDirty сброшен — повторное сохранение без правок не пересылает characters
    onSave.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /сохранить/i }));
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]).toHaveLength(1);

    // При обновлении book.characters после refetch отображается ID #99
    rerender(
      <BookEditModal
        book={{
          ...baseModalBook,
          characters: [
            {
              id: 10,
              characterId: 99,
              slug: "paul-atreides",
              name: "Пол Атрейдес",
              aliases: [],
              universeSlug: null,
              role: "protagonist",
              summary:
                "Наследник дома Атрейдесов, отправляющийся на пустынную планету Арракис.",
              traits: [],
              relations: [],
              otherBooks: [],
            },
          ],
        }}
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

    expect(screen.getByText("ID #99")).toBeInTheDocument();
  });

  it("очищает Markdown hard-line-break и &#x20; при импорте персонажей и паспорта книги в BookEditModal", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <BookEditModal
        book={baseModalBook}
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

    const guideTextarea = screen.getByLabelText(/AI-паспорт/i) as HTMLTextAreaElement;
    fireEvent.change(guideTextarea, {
      target: {
        value: [
          "{\\",
          '&#x20; "short_hook": "История о физике и шаровой молнии",\\',
          '&#x20; "target_audience": "Любителям твёрдой научной фантастики",\\',
          '&#x20; "friction_points": "Тем, кто ждёт лёгкого фэнтези",\\',
          '&#x20; "reading_pace": "Размеренный",\\',
          '&#x20; "difficulty": "Средняя сложность",\\',
          '&#x20; "vibe": "загадочный, научный",\\',
          '&#x20; "key_takeaways": ["Одержимость наукой"]\\',
          "}",
        ].join("\n"),
      },
    });
    fireEvent.blur(guideTextarea);

    expect(screen.queryByText(/невалидный json паспорта/i)).not.toBeInTheDocument();
    expect(guideTextarea.value).not.toContain("&#x20;");

    fireEvent.click(screen.getByRole("button", { name: /Вставить JSON из ИИ/i }));
    const charsTextarea = screen.getByLabelText(/JSON персонажей из ИИ/i);
    fireEvent.change(charsTextarea, {
      target: {
        value: [
          "[\\",
          "&#x20; {\\",
          '&#x20;   "name": "Чэнь",\\',
          '&#x20;   "aliases": ["Доктор Чэнь"],\\',
          '&#x20;   "universeSlug": null,\\',
          '&#x20;   "role": "protagonist",\\',
          '&#x20;   "traits": ["Любознательный"],\\',
          '&#x20;   "summary": "Физик, посвятивший жизнь изучению шаровой молнии.",\\',
          '&#x20;   "relations": [{"targetName": "Чжан Бинь", "label": "Научный наставник"}]\\',
          "&#x20; }\\",
          "]",
        ].join("\n"),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /Применить JSON/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /сохранить/i }));
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        readingGuide: expect.objectContaining({
          short_hook: "История о физике и шаровой молнии",
        }),
      }),
      [
        expect.objectContaining({
          name: "Чэнь",
          relations: [{ targetName: "Чжан Бинь", label: "Научный наставник" }],
        }),
      ],
    );
  });
});
