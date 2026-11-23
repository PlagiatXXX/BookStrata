import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StoryTicketCard } from "./StoryTicketCard";

describe("StoryTicketCard", () => {
  it("рендерит номер билета, архетип, кастомное имя и любимые книги в формате Stories", () => {
    render(
      <StoryTicketCard
        ticketNumber="BS-7492-X"
        customName="Фёдор"
        archetypeName="Архитектор смыслов"
        motto="Строить соборы из слов"
        axes={{
          storyFocus: 85,
          emotionalWeight: 80,
          pace: 65,
          darkness: 60,
          scope: 75,
          complexity: 90,
        }}
        favoriteBooks={[
          { title: "Имя розы", author: "Умберто Эко" },
          { title: "Улисс", author: "Джеймс Джойс" },
        ]}
        theme="craft"
      />
    );

    expect(screen.getAllByText(/BS-7492-X/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Фёдор · Читательский архетип/i)).toBeInTheDocument();
    expect(screen.getByText("Архитектор смыслов")).toBeInTheDocument();
    expect(screen.getByText(/Строить соборы из слов/i)).toBeInTheDocument();
    expect(screen.getByText(/Имя розы/i)).toBeInTheDocument();
    expect(screen.getByText("Умберто Эко")).toBeInTheDocument();
  });

  it("рендерит книгу-криптонит с плашкой иммунитета, если она передана", () => {
    render(
      <StoryTicketCard
        ticketNumber="BS-7492-X"
        archetypeName="Архитектор смыслов"
        axes={{
          storyFocus: 85,
          emotionalWeight: 80,
          pace: 65,
          darkness: 60,
          scope: 75,
          complexity: 90,
        }}
        favoriteBooks={[]}
        kryptoniteBook={{ title: "Сумерки", author: "Стефани Майер" }}
        theme="craft"
      />
    );

    expect(screen.getByText(/КРИПТОНИТ/i)).toBeInTheDocument();
    expect(screen.getByText("Сумерки")).toBeInTheDocument();
    expect(screen.getByText("Стефани Майер")).toBeInTheDocument();
  });
});
