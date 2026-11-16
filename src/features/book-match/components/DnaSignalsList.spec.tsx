import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DnaSignalsList } from "./DnaSignalsList";
import type { DnaSignals } from "../domain/dnaSignals";

describe("DnaSignalsList", () => {
  it("ничего не рендерит, если нет активных сигналов", () => {
    const signals: DnaSignals = {
      isFavoriteAuthor: false,
      isDislikedGenre: false,
      isLikedGenre: false,
      isHolyGrailBook: false,
      kryptoniteRisk: false,
    };
    const { container } = render(<DnaSignalsList signals={signals} />);
    expect(container.firstChild).toBeNull();
  });

  it("рендерит бейдж любимого автора", () => {
    const signals: DnaSignals = {
      isFavoriteAuthor: true,
      isDislikedGenre: false,
      isLikedGenre: false,
      isHolyGrailBook: false,
      kryptoniteRisk: false,
    };
    render(<DnaSignalsList signals={signals} />);
    expect(screen.getByText(/любимый автор из твоего билета/i)).toBeInTheDocument();
  });

  it("рендерит бейдж книги-святыни", () => {
    const signals: DnaSignals = {
      isFavoriteAuthor: false,
      isDislikedGenre: false,
      isLikedGenre: false,
      isHolyGrailBook: true,
      kryptoniteRisk: false,
    };
    render(<DnaSignalsList signals={signals} />);
    expect(screen.getByText(/входит в золотую тройку твоего днк/i)).toBeInTheDocument();
  });

  it("рендерит предупреждение о нежелательном жанре с названием жанра и фолбэком", () => {
    const signalsWithName: DnaSignals = {
      isFavoriteAuthor: false,
      isDislikedGenre: true,
      isLikedGenre: false,
      isHolyGrailBook: false,
      kryptoniteRisk: false,
      dislikedGenreName: "Хоррор",
    };
    const { rerender } = render(<DnaSignalsList signals={signalsWithName} />);
    expect(screen.getByText(/жанр «хоррор» в твоем списке нежелательных/i)).toBeInTheDocument();

    const signalsWithoutName: DnaSignals = {
      ...signalsWithName,
      dislikedGenreName: undefined,
    };
    rerender(<DnaSignalsList signals={signalsWithoutName} />);
    expect(screen.getByText(/в твоем списке нежелательных жанров/i)).toBeInTheDocument();
  });

  it("рендерит предупреждение о риске криптонита", () => {
    const signals: DnaSignals = {
      isFavoriteAuthor: false,
      isDislikedGenre: false,
      isLikedGenre: false,
      isHolyGrailBook: false,
      kryptoniteRisk: true,
    };
    render(<DnaSignalsList signals={signals} />);
    expect(screen.getByText(/книга близка к твоему антиподу-криптониту/i)).toBeInTheDocument();
  });

  it("рендерит несколько сигналов одновременно в доступной группе", () => {
    const signals: DnaSignals = {
      isFavoriteAuthor: true,
      isDislikedGenre: false,
      isLikedGenre: true,
      isHolyGrailBook: true,
      kryptoniteRisk: true,
    };
    render(<DnaSignalsList signals={signals} />);
    const group = screen.getByRole("group", { name: /сигналы соответствия днк/i });
    expect(group).toBeInTheDocument();
    expect(screen.getByText(/любимый автор из твоего билета/i)).toBeInTheDocument();
    expect(screen.getByText(/входит в золотую тройку твоего днк/i)).toBeInTheDocument();
    expect(screen.getByText(/книга близка к твоему антиподу-криптониту/i)).toBeInTheDocument();
  });
});
