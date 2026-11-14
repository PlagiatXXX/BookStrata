import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DnaStepFlow } from "./DnaStepFlow";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("DnaStepFlow", () => {
  it("начинается с 6 шкал калибровки и отображает вопрос шкалы 1, кнопка «Дальше» изначально заблокирована", () => {
    renderWithClient(<DnaStepFlow onComplete={vi.fn()} theme="craft" />);

    expect(screen.getByText(/Что вам нравится в книге\?/i)).toBeInTheDocument();
    expect(screen.getAllByText("Сюжет").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Рефлексия").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Дальше/i })).toBeDisabled();
  });

  it("позволяет двигать ползунок, разблокирует кнопку «Дальше» и переходит на следующий шаг", async () => {
    const user = userEvent.setup();
    const onAxisChange = vi.fn();

    renderWithClient(
      <DnaStepFlow onComplete={vi.fn()} onAxisChange={onAxisChange} theme="craft" />
    );

    const nextBtn = screen.getByRole("button", { name: /Дальше/i });
    expect(nextBtn).toBeDisabled();

    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowRight" });

    expect(onAxisChange).toHaveBeenCalledWith("storyFocus", 5);
    expect(nextBtn).toBeEnabled();

    await user.click(nextBtn);

    // Перешли на вопрос 2
    expect(screen.getByText(/Сколько усилий вы готовы вложить\?/i)).toBeInTheDocument();
  });

  it("на 7-м шаге отображает ввод книг с автокомплитом и кнопку «Запечатать билет»", async () => {
    renderWithClient(<DnaStepFlow onComplete={vi.fn()} theme="light" initialStep={6} />);

    expect(screen.getByText(/Печать: ваши книги/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Название книги/i)).toBeInTheDocument();

    const sealBtn = screen.getByRole("button", { name: /Запечатать билет/i });
    expect(sealBtn).toBeInTheDocument();
  });
});
