/// <reference types="vitest/globals" />

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ProfileGenres } from "./ProfileGenres"
import type { CategoryId } from "@/data/genre-taxonomy"

const genres: CategoryId[] = ["fantasy", "sci-fi", "non-fiction"]

describe("ProfileGenres", () => {
  it("рендерит теги выбранных жанров по их label из таксономии", () => {
    render(<ProfileGenres genres={genres} isOwner={false} />)

    expect(screen.getByRole("region", { name: "Любимые жанры" })).toBeInTheDocument()
    expect(screen.getByText("Фэнтези")).toBeInTheDocument()
    expect(screen.getByText("Фантастика")).toBeInTheDocument()
    expect(screen.getByText("Нон-фикшн")).toBeInTheDocument()
  })

  it("теги без счётчика — у посетителя нет «N/M» и кнопки «Изменить»", () => {
    render(<ProfileGenres genres={genres} isOwner={false} />)

    expect(screen.queryByText(/\/\d+$/)).not.toBeInTheDocument()
    expect(screen.queryByText("3/7")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Изменить" })).not.toBeInTheDocument()
  })

  it("у владельца есть кнопка «Изменить», клик вызывает onEdit", () => {
    const onEdit = vi.fn()
    render(<ProfileGenres genres={genres} isOwner onEdit={onEdit} />)

    fireEvent.click(screen.getByRole("button", { name: "Изменить" }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it("при пустом массиве блок не рендерится", () => {
    const { container } = render(<ProfileGenres genres={[]} isOwner onEdit={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText("Любимые жанры")).not.toBeInTheDocument()
  })
})
