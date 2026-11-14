import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TicketBookCover } from "./TicketBookCover";

describe("TicketBookCover", () => {
  it("рендерит реальное изображение обложки, если coverImageUrl передан", () => {
    render(
      <TicketBookCover
        book={{
          title: "Мастер и Маргарита",
          author: "Михаил Булгаков",
          coverImageUrl: "/covers/master.jpg",
        }}
        isDark={true}
      />
    );

    const img = screen.getByAltText("Мастер и Маргарита");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/covers/master.jpg");
  });

  it("рендерит стилизованный архивный фолиант, если обложки нет", () => {
    render(
      <TicketBookCover
        book={{
          title: "Редкая книга",
          author: "Неизвестный автор",
        }}
        isDark={true}
      />
    );

    expect(screen.getAllByText("Редкая книга").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Неизвестный автор").length).toBeGreaterThan(0);
  });

  it("для криптонита отображает стилизацию антипода", () => {
    render(
      <TicketBookCover
        book={{
          title: "Криптонит Томов",
        }}
        isDark={true}
        isKryptonite={true}
      />
    );

    expect(screen.getAllByText("Криптонит Томов").length).toBeGreaterThan(0);
    expect(screen.getByTestId("kryptonite-badge")).toBeInTheDocument();
  });
});
