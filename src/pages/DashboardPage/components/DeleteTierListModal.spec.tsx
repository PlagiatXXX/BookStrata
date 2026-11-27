import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeleteTierListModal } from "./DeleteTierListModal";

const mockTriggerDustDisintegrate = vi.fn();

vi.mock("@/components/DustDelete", () => ({
  triggerDustDisintegrate: (...args: unknown[]) =>
    mockTriggerDustDisintegrate(...args),
}));

describe("DeleteTierListModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("рассыпает карточку модалки в пыль и вызывает onDelete при подтверждении", () => {
    const onDelete = vi.fn();
    const onClose = vi.fn();

    render(
      <DeleteTierListModal
        isOpen={true}
        onClose={onClose}
        onDelete={onDelete}
        tierListTitle="Лучшие книги года"
        isPending={false}
      />,
    );

    const deleteButton = screen.getByRole("button", { name: "Удалить" });
    fireEvent.click(deleteButton);

    expect(mockTriggerDustDisintegrate).toHaveBeenCalledTimes(1);
    expect(mockTriggerDustDisintegrate.mock.calls[0][0]).toBeInstanceOf(HTMLElement);
    expect(mockTriggerDustDisintegrate.mock.calls[0][1]).toEqual({ stepPx: 3 });

    const dialog = screen.getByRole("dialog");
    const card = dialog.querySelector(".dashboard-modal");
    expect(card?.className).toContain("opacity-0");
    expect(card?.className).toContain("pointer-events-none");
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
