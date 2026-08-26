import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActivityChart, buildSmoothPath } from "./ActivityChart";
import type { ActivityTimelinePoint } from "@/lib/userApi";

const data: ActivityTimelinePoint[] = [
  { month: "2026-03", books: 2, likes: 1 },
  { month: "2026-04", books: 0, likes: 0 },
  { month: "2026-05", books: 5, likes: 3 },
  { month: "2026-06", books: 1, likes: 0 },
  { month: "2026-07", books: 3, likes: 7 },
  { month: "2026-08", books: 0, likes: 2 },
];

describe("ActivityChart", () => {
  it("рендерит подписи месяцев и легенду", () => {
    render(<ActivityChart data={data} isLoading={false} />);
    expect(screen.getByText("Книг за месяц")).toBeInTheDocument();
    expect(screen.getByText("Лайков за месяц")).toBeInTheDocument();
    expect(screen.getByText("Мар")).toBeInTheDocument();
    expect(screen.getByText("Авг")).toBeInTheDocument();
  });

  it("показывает empty state на нулевых данных", () => {
    const empty = data.map((p) => ({ ...p, books: 0, likes: 0 }));
    render(<ActivityChart data={empty} isLoading={false} />);
    expect(screen.getByText(/здесь появится график/i)).toBeInTheDocument();
  });

  it("показывает тултип при наведении на колонку", () => {
    render(<ActivityChart data={data} isLoading={false} />);
    fireEvent.mouseEnter(screen.getByTestId("chart-col-4"));
    expect(screen.getByTestId("chart-tooltip")).toHaveTextContent("Июл");
  });

  it("в состоянии загрузки не рендерит график", () => {
    render(<ActivityChart data={[]} isLoading={true} />);
    expect(screen.queryByTestId("chart-svg")).not.toBeInTheDocument();
  });
});

describe("buildSmoothPath", () => {
  it("строит кубические кривые через точки", () => {
    const d = buildSmoothPath([
      { x: 0, y: 100 },
      { x: 100, y: 50 },
      { x: 200, y: 80 },
    ]);
    expect(d).toMatch(/^M 0,100/);
    expect(d).toContain("C");
  });
});
