import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Мокаем DashboardLayout для проверки переданных в него пропсов
vi.mock("@/layouts/DashboardLayout/DashboardLayout", () => ({
  DashboardLayout: ({
    children,
    contentTopPadding,
  }: {
    children: React.ReactNode;
    contentTopPadding?: string;
  }) => (
    <div data-testid="mock-dashboard-layout" data-content-top-padding={contentTopPadding}>
      {children}
    </div>
  ),
}));

vi.mock("./EditorHeader", () => ({
  EditorHeader: () => <div data-testid="mock-editor-header" />,
}));

vi.mock("./TierListCoverEditor", () => ({
  TierListCoverEditor: () => <div data-testid="mock-cover-editor" />,
}));

vi.mock("./ThemePicker", () => ({
  ThemePicker: () => <div data-testid="mock-theme-picker" />,
}));

vi.mock("@/components/SEO/Breadcrumbs", () => ({
  Breadcrumbs: () => <div data-testid="mock-breadcrumbs" />,
}));

import { EditorLayout } from "./EditorLayout";

const baseProps = {
  activeItem: null,
  onDragStart: vi.fn(),
  onDragOver: vi.fn(),
  onDragEnd: vi.fn(),
  onDragCancel: vi.fn(),
  headerProps: {
    title: "Тестовый тир-лист",
    isReadOnly: true,
  } as any,
  onMyRatingsClick: vi.fn(),
  isReadOnly: true,
  booksCount: 0,
};

describe("EditorLayout — верхний отступ и фон темы", () => {
  it("передаёт contentTopPadding='pt-0' в DashboardLayout, чтобы не было полосы цвета сайта", () => {
    const { getByTestId } = render(
      <EditorLayout {...baseProps}>
        <div>Контент</div>
      </EditorLayout>,
    );

    const layout = getByTestId("mock-dashboard-layout");
    expect(layout.getAttribute("data-content-top-padding")).toBe("pt-0");
  });

  it("в режиме просмотра (isReadOnly) задаёт pt-24 на neo-brutalist-editor", () => {
    const { container } = render(
      <EditorLayout {...baseProps} isReadOnly={true}>
        <div>Контент</div>
      </EditorLayout>,
    );

    const main = container.querySelector(".neo-brutalist-editor");
    expect(main).not.toBeNull();
    expect(main?.className).toContain("pt-24");
    expect(main?.className).not.toContain("pt-1");
  });

  it("в режиме редактирования (isReadOnly=false) задаёт pt-28 на neo-brutalist-editor", () => {
    const { container } = render(
      <EditorLayout {...baseProps} isReadOnly={false}>
        <div>Контент</div>
      </EditorLayout>,
    );

    const main = container.querySelector(".neo-brutalist-editor");
    expect(main).not.toBeNull();
    expect(main?.className).toContain("pt-28");
  });

  it("в стрим-режиме (isStreamMode=true) использует компактный отступ без зазора под шапку", () => {
    const { container } = render(
      <EditorLayout {...baseProps} isReadOnly={true} isStreamMode={true}>
        <div>Контент</div>
      </EditorLayout>,
    );

    const main = container.querySelector(".neo-brutalist-editor");
    expect(main).not.toBeNull();
    expect(main?.className).toContain("pt-1");
    expect(main?.className).not.toContain("pt-24");
  });
});
