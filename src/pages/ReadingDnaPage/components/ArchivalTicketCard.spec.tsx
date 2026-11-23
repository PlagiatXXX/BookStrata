import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ArchivalTicketCard } from "./ArchivalTicketCard";
import { getCasteSealUrl } from "../utils/casteSeals";

vi.mock("../hooks/useDnaArchetypes", () => ({
  useDnaArchetypes: () => ({
    archetypes: [
      {
        id: "dark-archivist",
        number: 5,
        caste: { id: "abyss", name: "Орден Бездны", sealColor: "#8a2433", badgeClass: "" },
        rarity: 7,
        names: { dark: "Хранитель запретных фолиантов", craft: "Полуночный затворник" },
        description: "Темная классика",
        quote: "В тенях всегда скрыто больше правды",
        specialSign: "",
        axisRanges: {
          storyFocus: { min: 53, max: 77 },
          emotionalWeight: { min: 73, max: 97 },
          pace: { min: 33, max: 57 },
          darkness: { min: 78, max: 100 },
          scope: { min: 43, max: 67 },
          complexity: { min: 63, max: 87 },
        },
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

describe("ArchivalTicketCard", () => {
  const sampleAxes = {
    storyFocus: 60,
    emotionalWeight: 75,
    pace: 50,
    darkness: 80,
    scope: 45,
    complexity: 70,
  };

  const zeroAxes = {
    storyFocus: 0,
    emotionalWeight: 0,
    pace: 0,
    darkness: 0,
    scope: 0,
    complexity: 0,
  };

  it("в незапечатанном состоянии с нулевыми осями отображает заглушку титула, пунктирные книги и пустую печать без троеточий", () => {
    render(
      <ArchivalTicketCard
        ticketNumber="BS-....."
        archetypeName=""
        axes={zeroAxes}
        favoriteBooks={[]}
        kryptoniteBook={null}
        theme="light"
        isSealed={false}
      />
    );

    expect(screen.getByText("BS-.....")).toBeInTheDocument();
    expect(screen.getByText(/Титул определится/)).toBeInTheDocument();
    expect(screen.getByText(/после теста/)).toBeInTheDocument();
    expect(screen.getAllByText("книга").length).toBe(3);
    expect(screen.getByText("криптонит")).toBeInTheDocument();
    expect(screen.getByText("печать")).toBeInTheDocument();
    expect(screen.queryAllByText("...")).toHaveLength(0);
  });

  it("рендерит названия книг и криптонита ПОД обложками, а не внутри обложек, и без троеточий", () => {
    render(
      <ArchivalTicketCard
        ticketNumber="BS-....."
        archetypeName=""
        axes={sampleAxes}
        favoriteBooks={[
          { title: "Норвежский лес", author: "Харуки Мураками" },
          { title: "Пикник на обочине" }, // без автора
        ]}
        kryptoniteBook={{ title: "Трое в лодке", author: "Джером К. Джером" }}
        theme="dark"
        isSealed={false}
      />
    );

    // Названия книг отображаются
    const book1Title = screen.getByText("Норвежский лес");
    const book2Title = screen.getByText("Пикник на обочине");
    const kryptoTitle = screen.getByText("Трое в лодке");

    expect(book1Title).toBeInTheDocument();
    expect(book2Title).toBeInTheDocument();
    expect(kryptoTitle).toBeInTheDocument();

    // Авторы отображаются под соответствующими книгами
    expect(screen.getByText("Харуки Мураками")).toBeInTheDocument();
    expect(screen.getByText("Джером К. Джером")).toBeInTheDocument();

    // Никаких паразитных "..." нет ни под одной обложкой
    expect(screen.queryAllByText("...")).toHaveLength(0);

    // Никаких надписей "ТОМ 1", "ТОМ 2" и т.п. на обложках нет
    expect(screen.queryByText(/ТОМ\s*\d/i)).not.toBeInTheDocument();

    // Обозначения сверху: Священные книги над первыми тремя и бейджик Криптонит
    expect(screen.getByText(/Священные книги/i)).toBeInTheDocument();
    expect(screen.getByText(/КРИПТОНИТ/i)).toBeInTheDocument();
  });

  it("в запечатанном состоянии рендерит реальный номер билета, орден, слоган-девиз и бейдж редкости", () => {
    render(
      <ArchivalTicketCard
        ticketNumber="BS-04821"
        archetypeName="Хранитель запретных фолиантов"
        axes={sampleAxes}
        favoriteBooks={[
          { title: "Преступление и наказание", author: "Ф. Достоевский" },
          { title: "Имя розы", author: "У. Эко" },
          { title: "Дюна", author: "Фрэнк Герберт" },
        ]}
        kryptoniteBook={{ title: "Криптонит" }}
        theme="dark"
        isSealed={true}
      />
    );

    expect(screen.getByText("BS-04821")).toBeInTheDocument();
    expect(screen.getByText("Хранитель запретных фолиантов")).toBeInTheDocument();
    expect(screen.getByText(/В тенях всегда скрыто больше правды/)).toBeInTheDocument();
    expect(screen.getByText(/ОРДЕН БЕЗДНЫ/i)).toBeInTheDocument();
    expect(screen.getByText(/РЕДКОСТЬ 7%/i)).toBeInTheDocument();
    expect(screen.getByText(/АРХЕТИП №5\/16/i)).toBeInTheDocument();
    expect(screen.getByText(/ДНК · 60—75—50—80—45—70/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Печать" })).toHaveAttribute("src", "/images/reading-dna/seal-abyss.webp");
    expect(screen.getByText("Преступление и наказание")).toBeInTheDocument();
  });

  it("рендерит картинку печати, если передан sealImageUrl", () => {
    render(
      <ArchivalTicketCard
        ticketNumber="BS-04821"
        archetypeName=""
        axes={sampleAxes}
        favoriteBooks={[]}
        kryptoniteBook={null}
        theme="dark"
        isSealed={true}
        sealImageUrl="/images/reading-dna/seal.webp"
      />
    );

    const sealImg = screen.getByRole("img", { name: "Печать" });
    expect(sealImg).toBeInTheDocument();
    expect(sealImg).toHaveAttribute("src", "/images/reading-dna/seal.webp");
  });

  it("рендерит фолбэк ИММУНИТЕТ, если загрузка изображения печати завершилась с ошибкой", () => {
    render(
      <ArchivalTicketCard
        ticketNumber="BS-04821"
        archetypeName=""
        axes={sampleAxes}
        favoriteBooks={[]}
        kryptoniteBook={null}
        theme="dark"
        isSealed={true}
      />
    );

    const sealImg = screen.getByRole("img", { name: "Печать" });
    fireEvent.error(sealImg);
    expect(screen.getByText("ИММУНИТЕТ")).toBeInTheDocument();
  });

  it("отображает имя владельца customName на билете, если оно передано", () => {
    render(
      <ArchivalTicketCard
        ticketNumber="BS-04821"
        customName="Саша"
        archetypeName="Хранитель запретных фолиантов"
        axes={sampleAxes}
        favoriteBooks={[]}
        kryptoniteBook={null}
        theme="dark"
        isSealed={true}
      />
    );

    expect(screen.getByText("Саша")).toBeInTheDocument();
  });

  it("использует реальный rarityPercent из БД на бейдже вместо статичной редкости", () => {
    render(
      <ArchivalTicketCard
        ticketNumber="BS-04821"
        archetypeName="Хранитель запретных фолиантов"
        rarityPercent={4.2}
        axes={sampleAxes}
        favoriteBooks={[]}
        kryptoniteBook={null}
        theme="dark"
        isSealed={true}
      />
    );

    expect(screen.getByText(/РЕДКОСТЬ 4.2%/i)).toBeInTheDocument();
  });

  it("getCasteSealUrl возвращает правильные пути к печатям орденов", () => {
    expect(getCasteSealUrl("mind")).toBe("/images/reading-dna/seal-mind.webp");
    expect(getCasteSealUrl("abyss")).toBe("/images/reading-dna/seal-abyss.webp");
    expect(getCasteSealUrl("action")).toBe("/images/reading-dna/seal-action.webp");
    expect(getCasteSealUrl("light")).toBe("/images/reading-dna/seal-light.webp");
    expect(getCasteSealUrl(null)).toBe("/images/reading-dna/seal.webp");
    expect(getCasteSealUrl(undefined)).toBe("/images/reading-dna/seal.webp");
  });

  it("автоматически подставляет печать ордена по архетипу, если sealImageUrl не передан", () => {
    render(
      <ArchivalTicketCard
        ticketNumber="BS-04821"
        archetypeName="Хранитель запретных фолиантов"
        axes={sampleAxes}
        favoriteBooks={[]}
        kryptoniteBook={null}
        theme="dark"
        isSealed={true}
      />
    );

    const sealImg = screen.getByRole("img", { name: "Печать" });
    expect(sealImg).toBeInTheDocument();
    // В моке архетип Хранитель запретных фолиантов принадлежит caste: abyss
    expect(sealImg).toHaveAttribute("src", "/images/reading-dna/seal-abyss.webp");
  });
});
