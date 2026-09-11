// src/pages/BookPage/BookReadingGuide.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookReadingGuide } from "./BookReadingGuide";
import type { ReadingGuide } from "@/lib/bookApi";

const guide: ReadingGuide = {
  short_hook: "История любви и мифа об американской мечте.",
  target_audience:
    "Ценителям лиричной прозы и читателям, любящим атмосферные романы о судьбах эпохи.",
  friction_points:
    "Тем, кто ждёт динамичного сюжета с интригами и погонями.",
  reading_pace: "размеренный",
  difficulty: "средне",
  vibe: "Ностальгия, атмосфера, Лирика",
  key_takeaways: [
    "Цена американской мечты",
    "Иллюзия и реальность",
    "Любовь как одержимость",
  ],
};

describe("BookReadingGuide", () => {
  it("рендерит все секции паспорта", () => {
    render(<BookReadingGuide guide={guide} />);
    expect(screen.getByText(/гид по чтению/i)).toBeInTheDocument();
    expect(screen.getByText(/кому понравится/i)).toBeInTheDocument();
    expect(screen.getByText(/кому пропустить/i)).toBeInTheDocument();
    expect(screen.getByText(guide.short_hook)).toBeInTheDocument();
    expect(screen.getByText(guide.target_audience)).toBeInTheDocument();
    expect(screen.getByText(guide.friction_points)).toBeInTheDocument();
    // takeaways рендерятся дважды (desktop + mobile) — используем getAllByText
    expect(screen.getAllByText("Цена американской мечты").length).toBeGreaterThan(0);
  });

  it("рендерит темп животными: быстрый — активный заяц (emerald), остальные приглушены", () => {
    render(
      <BookReadingGuide guide={{ ...guide, reading_pace: "быстрый" }} />,
    );
    const paceSection = screen.getByLabelText(/темп/i) as HTMLElement;
    const rabbits = paceSection.querySelectorAll(".text-emerald-400");
    const others = paceSection.querySelectorAll(".text-white\\/25");
    expect(rabbits.length).toBe(1);
    expect(others.length).toBe(2); // белка и черепаха приглушены
    expect(screen.getByText("Быстрый")).toBeInTheDocument();
  });

  it("рендерит темп животными: размеренный — активная белка (amber)", () => {
    render(
      <BookReadingGuide guide={{ ...guide, reading_pace: "размеренный" }} />,
    );
    const paceSection = screen.getByLabelText(/темп/i) as HTMLElement;
    const squirrels = paceSection.querySelectorAll(".text-amber-400");
    expect(squirrels.length).toBe(1);
    expect(screen.getByText("Размеренный")).toBeInTheDocument();
  });

  it("рендерит темп животными: медленный — активная черепаха (indigo)", () => {
    render(
      <BookReadingGuide guide={{ ...guide, reading_pace: "медленный" }} />,
    );
    const paceSection = screen.getByLabelText(/темп/i) as HTMLElement;
    const turtles = paceSection.querySelectorAll(".text-indigo-400");
    expect(turtles.length).toBe(1);
    expect(screen.getByText("Медленный")).toBeInTheDocument();
  });

  it("рендерит шкалу сложности: легко — 1 деление (green)", () => {
    render(
      <BookReadingGuide guide={{ ...guide, difficulty: "легко" }} />,
    );
    const diffSection = screen.getByLabelText(/сложность/i) as HTMLElement;
    const dots = diffSection.querySelectorAll(".bg-green-400");
    expect(dots.length).toBe(1);
  });

  it("рендерит шкалу сложности: средне — 2 деления (amber)", () => {
    render(
      <BookReadingGuide guide={{ ...guide, difficulty: "средне" }} />,
    );
    const diffSection = screen.getByLabelText(/сложность/i) as HTMLElement;
    const dots = diffSection.querySelectorAll(".bg-amber-400");
    expect(dots.length).toBe(2);
  });

  it("рендерит шкалу сложности: сложно — 3 деления (rose)", () => {
    render(
      <BookReadingGuide guide={{ ...guide, difficulty: "сложно" }} />,
    );
    const diffSection = screen.getByLabelText(/сложность/i) as HTMLElement;
    const dots = diffSection.querySelectorAll(".bg-rose-400");
    expect(dots.length).toBe(3);
  });

  it("fallback: неизвестное значение темпа → текстовый бейдж без шкалы", () => {
    render(
      <BookReadingGuide guide={{ ...guide, reading_pace: "Легко читается" }} />,
    );
    expect(screen.getByText("Легко читается")).toBeInTheDocument();
    // Шкала темпа не рендерится — aria-label "Темп:" отсутствует
    expect(screen.queryByLabelText(/темп:/i)).not.toBeInTheDocument();
  });

  it("нормализация: «Размеренный» (с большой буквы) → белка-шкала", () => {
    render(
      <BookReadingGuide guide={{ ...guide, reading_pace: "Размеренный" }} />,
    );
    const paceSection = screen.getByLabelText(/темп:/i) as HTMLElement;
    const squirrels = paceSection.querySelectorAll(".text-amber-400");
    expect(squirrels.length).toBe(1);
    expect(screen.getByText("Размеренный")).toBeInTheDocument();
  });

  it("нормализация: «Средняя сложность» → шкала сложности (средне)", () => {
    render(
      <BookReadingGuide guide={{ ...guide, difficulty: "Средняя сложность" }} />,
    );
    const diffSection = screen.getByLabelText(/сложность:/i) as HTMLElement;
    const dots = diffSection.querySelectorAll(".bg-amber-400");
    expect(dots.length).toBe(2);
    expect(screen.getByText("Средне")).toBeInTheDocument();
  });

  it("fallback: неизвестное значение сложности → текстовый бейдж без шкалы", () => {
    render(
      <BookReadingGuide guide={{ ...guide, difficulty: "Непонятно" }} />,
    );
    expect(screen.getByText("Непонятно")).toBeInTheDocument();
    // Шкала сложности не рендерится — aria-label "Сложность:" отсутствует
    expect(screen.queryByLabelText(/сложность:/i)).not.toBeInTheDocument();
  });

  it("разбивает vibe по запятым и рендерит бейджи", () => {
    render(<BookReadingGuide guide={guide} />);
    expect(screen.getByText("Ностальгия")).toBeInTheDocument();
    expect(screen.getByText("атмосфера")).toBeInTheDocument();
    expect(screen.getByText("Лирика")).toBeInTheDocument();
  });

  it("рендерит vibe как один бейдж если без запятых", () => {
    render(
      <BookReadingGuide guide={{ ...guide, vibe: "интеллектуальный" }} />,
    );
    expect(screen.getByText("интеллектуальный")).toBeInTheDocument();
  });

  it("нумерует тезисы 01, 02, 03", () => {
    render(<BookReadingGuide guide={guide} />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  it("скрывает секцию инсайтов при пустом key_takeaways", () => {
    render(<BookReadingGuide guide={{ ...guide, key_takeaways: [] }} />);
    expect(screen.queryByText(/ключевые/i)).not.toBeInTheDocument();
  });

  it("не рендерит блок «Кому пропустить» если friction_points пустой", () => {
    render(
      <BookReadingGuide guide={{ ...guide, friction_points: "" }} />,
    );
    expect(screen.queryByText(/кому пропустить/i)).not.toBeInTheDocument();
    expect(screen.getByText(/кому понравится/i)).toBeInTheDocument();
  });

  it("показывает маскота между «Кому понравится» и «Кому пропустить»", () => {
    render(<BookReadingGuide guide={guide} />);
    const mascot = screen.getByAltText(/маскот bookstrata/i);
    expect(mascot).toBeInTheDocument();
    // Только desktop (hidden md:block), на мобиле картинка не показывается
    expect(mascot.className).toContain("hidden");
    expect(mascot.className).toContain("md:block");
  });

  it("скрывает маскота, если friction_points пустой", () => {
    render(
      <BookReadingGuide guide={{ ...guide, friction_points: "" }} />,
    );
    expect(screen.queryByAltText(/маскот bookstrata/i)).not.toBeInTheDocument();
  });

  it("имеет aria-label для доступности", () => {
    render(<BookReadingGuide guide={guide} />);
    expect(
      screen.getByRole("region", { name: /гид по чтению/i }),
    ).toBeInTheDocument();
  });
});
