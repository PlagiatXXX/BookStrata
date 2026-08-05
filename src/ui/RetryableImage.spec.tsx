import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RetryableImage } from "./RetryableImage";

describe("RetryableImage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("рендерит img с переданным src", () => {
    render(<RetryableImage src="https://example.com/cover.jpg" alt="cover" />);
    const img = screen.getByAltText("cover");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/cover.jpg");
  });

  it("при ошибке повторяет попытку с параметром bs_retry=1", () => {
    render(<RetryableImage src="https://example.com/cover.jpg" alt="cover" />);
    const img = screen.getByAltText("cover");

    fireEvent.error(img);

    expect(img).toHaveAttribute("src", "https://example.com/cover.jpg?bs_retry=1");
    expect(screen.queryByAltText("fallback")).not.toBeInTheDocument();
  });

  it("после исчерпания попыток подставляет fallbackSrc", () => {
    render(
      <RetryableImage
        src="https://example.com/cover.jpg"
        alt="cover"
        fallbackSrc="/images/placeholder.svg"
        maxRetries={2}
      />,
    );
    const img = screen.getByAltText("cover");

    fireEvent.error(img); // bs_retry=1
    fireEvent.error(img); // bs_retry=2
    fireEvent.error(img); // exhausted

    expect(img).toHaveAttribute("src", "/images/placeholder.svg");
  });

  it("после исчерпания попыток вызывает onError (старое поведение)", () => {
    const onError = vi.fn();
    render(<RetryableImage src="https://example.com/cover.jpg" alt="cover" maxRetries={1} onError={onError} />);
    const img = screen.getByAltText("cover");

    fireEvent.error(img); // bs_retry=1
    fireEvent.error(img); // exhausted

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("onLoad пробрасывается на успешную загрузку", () => {
    const onLoad = vi.fn();
    render(<RetryableImage src="https://example.com/cover.jpg" alt="cover" onLoad={onLoad} />);
    const img = screen.getByAltText("cover");

    fireEvent.load(img);

    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it("после успешного ретрая оставляет src с параметром bs_retry (закрепляет кэш)", () => {
    render(<RetryableImage src="https://example.com/cover.jpg" alt="cover" />);
    const img = screen.getByAltText("cover");

    fireEvent.error(img); // bs_retry=1
    fireEvent.load(img);

    // URL с параметром уже в кэше браузера (immutable) — оставляем его,
    // чтобы следующий показ взял картинку из кэша, а не снова падал
    expect(img).toHaveAttribute("src", "https://example.com/cover.jpg?bs_retry=1");
  });

  it("сбрасывает retry-состояние при смене src (новая попытка с каноничного URL)", () => {
    const { rerender } = render(<RetryableImage src="https://example.com/1.jpg" alt="cover" maxRetries={1} onError={vi.fn()} />);
    const img = screen.getByAltText("cover");

    fireEvent.error(img); // bs_retry=1
    expect(img).toHaveAttribute("src", "https://example.com/1.jpg?bs_retry=1");

    rerender(<RetryableImage src="https://example.com/2.jpg" alt="cover" maxRetries={1} />);

    // Для новой картинки стартуем с каноничного URL
    expect(img).toHaveAttribute("src", "https://example.com/2.jpg");

    fireEvent.error(img); // первая попытка нового src
    expect(img).toHaveAttribute("src", "https://example.com/2.jpg?bs_retry=1");
  });
});
