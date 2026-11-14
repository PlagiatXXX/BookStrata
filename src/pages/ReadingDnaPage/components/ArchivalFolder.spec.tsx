import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ArchivalFolder } from "./ArchivalFolder";

describe("ArchivalFolder", () => {
  it("рендерит архивный ярлык папки с номером дела и грифом конфиденциальности", () => {
    render(
      <ArchivalFolder
        caseNumber="BS-7749-DNA"
        theme="dark"
        leftContent={<div>Левый лист</div>}
        rightContent={<div>Правый лист</div>}
      />
    );

    expect(screen.getByText(/архив тайного общества/i)).toBeInTheDocument();
    expect(screen.getByText(/дело № bs-7749-dna/i)).toBeInTheDocument();
    expect(screen.getByText(/строго конфиденциально/i)).toBeInTheDocument();
    expect(screen.getByText("Левый лист")).toBeInTheDocument();
    expect(screen.getByText("Правый лист")).toBeInTheDocument();
  });

  it("рендерит центральный корешок папки на десктопе", () => {
    const { container } = render(
      <ArchivalFolder
        theme="dark"
        leftContent={<div>Левый</div>}
        rightContent={<div>Правый</div>}
      />
    );

    const spine = container.querySelector("[data-testid='archival-folder-spine']");
    expect(spine).toBeInTheDocument();
  });

  it("корректно переключает оформление между темной и крафтовой темами", () => {
    const { container, rerender } = render(
      <ArchivalFolder
        theme="dark"
        leftContent={<div>L</div>}
        rightContent={<div>R</div>}
      />
    );
    expect(container.firstChild).toHaveClass("theme-dark");

    rerender(
      <ArchivalFolder
        theme="craft"
        leftContent={<div>L</div>}
        rightContent={<div>R</div>}
      />
    );
    expect(container.firstChild).toHaveClass("theme-craft");
  });
});
