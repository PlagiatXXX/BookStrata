import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DnaStepFlow } from "./DnaStepFlow";

describe("DnaStepFlow", () => {
  it("на первом шаге запрашивает 3 любимые книги и не пускает дальше, пока они не заполнены", async () => {
    const user = userEvent.setup();
    render(<DnaStepFlow onComplete={vi.fn()} theme="dark" />);

    expect(screen.getByText(/3 Книги-Святыни/i)).toBeInTheDocument();

    const nextBtn = screen.getByRole("button", { name: /Далее/i });
    expect(nextBtn).toBeDisabled();

    // Заполняем 3 книги
    const inputs = screen.getAllByPlaceholderText(/Название книги/i);
    expect(inputs.length).toBe(3);

    await user.type(inputs[0]!, "Мастер и Маргарита");
    await user.type(inputs[1]!, "1984");
    await user.type(inputs[2]!, "Дюна");

    expect(nextBtn).not.toBeDisabled();
    await user.click(nextBtn);

    // Перешли на шаг 2: Криптонит (с учетом waitFor анимации Framer Motion)
    expect(await screen.findByText(/Книга-Криптонит/i)).toBeInTheDocument();
  });

  it("позволяет вернуться на предыдущий шаг по кнопке «Назад»", async () => {
    const user = userEvent.setup();
    render(<DnaStepFlow onComplete={vi.fn()} theme="dark" />);

    const inputs = screen.getAllByPlaceholderText(/Название книги/i);
    await user.type(inputs[0]!, "Книга 1");
    await user.type(inputs[1]!, "Книга 2");
    await user.type(inputs[2]!, "Книга 3");

    await user.click(screen.getByRole("button", { name: /Далее/i }));
    expect(await screen.findByText(/Книга-Криптонит/i)).toBeInTheDocument();

    const backBtn = screen.getByRole("button", { name: /Назад/i });
    await user.click(backBtn);

    expect(await screen.findByText(/3 Книги-Святыни/i)).toBeInTheDocument();
  });
});
