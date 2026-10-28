import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HalloweenAtmosphere } from "./HalloweenAtmosphere";

describe("HalloweenAtmosphere", () => {
  it("smoothly follows the pointer, renders layered light, and cleans up listeners", () => {
    const themeRoot = document.createElement("div");
    themeRoot.className = "theme-container--halloween";
    const frames: FrameRequestCallback[] = [];
    const requestFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
      });
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame");
    const { container, unmount } = render(<HalloweenAtmosphere />, { container: themeRoot });
    const removeEventListener = vi.spyOn(window, "removeEventListener");

    expect(container.querySelector(".halloween-night-mask")).not.toBeNull();
    expect(container.querySelector(".halloween-torch-glow")).not.toBeNull();
    expect(container.querySelector(".halloween-torch-vignette")).not.toBeNull();
    expect(container.querySelectorAll(".halloween-ghost")).toHaveLength(2);
    expect(container.querySelector(".halloween-cobweb")).not.toBeNull();

    fireEvent.pointerMove(window, { clientX: 123, clientY: 234 });
    expect(themeRoot.style.getPropertyValue("--halloween-torch-x")).not.toBe("123px");

    act(() => {
      frames.shift()?.(16);
    });
    expect(Number.parseFloat(themeRoot.style.getPropertyValue("--halloween-torch-x"))).toBeGreaterThan(123);
    expect(Number.parseFloat(themeRoot.style.getPropertyValue("--halloween-torch-y"))).toBeGreaterThan(234);

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
      "pointermove",
      expect.any(Function),
    );
    expect(cancelFrame).toHaveBeenCalled();
    requestFrame.mockRestore();
    cancelFrame.mockRestore();
    removeEventListener.mockRestore();
  });
});
