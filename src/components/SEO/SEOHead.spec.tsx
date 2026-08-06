/// <reference types="vitest/globals" />

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SEOHead } from "./SEOHead";

type JsonLdObject = Record<string, unknown> & { "@type"?: string };

function getJsonLdScripts(): JsonLdObject[] {
  return Array.from(
    document.querySelectorAll('script[type="application/ld+json"]'),
  ).map((el) => JSON.parse(el.textContent || "{}") as JsonLdObject);
}

function getPersonJsonLd(): JsonLdObject | undefined {
  return getJsonLdScripts().find((s) => s["@type"] === "Person");
}

describe("SEOHead", () => {
  it("не рендерит Person JSON-LD без пропа person", () => {
    render(<SEOHead title="Тест" url="/test" />);
    expect(getPersonJsonLd()).toBeUndefined();
  });

  it("рендерит Person JSON-LD при передаче person", () => {
    render(
      <SEOHead
        title="Иван Иванов"
        url="/users/42"
        person={{
          name: "Иван Иванов",
          image: "https://example.com/avatar.jpg",
          description: "Описание профиля",
          knowsAbout: "Писатель",
        }}
      />,
    );

    const person = getPersonJsonLd();
    expect(person).toBeDefined();
    expect(person!.name).toBe("Иван Иванов");
    expect(person!.url).toBe("https://bookstrata.ru/users/42");
    expect(person!.image).toBe("https://example.com/avatar.jpg");
    expect(person!.description).toBe("Описание профиля");
    expect(person!.knowsAbout).toBe("Писатель");
  });

  it("использует description из пропа description, если person.description не задан", () => {
    render(
      <SEOHead
        title="Иван Иванов"
        description="Профиль пользователя на BookStrata"
        url="/users/42"
        person={{ name: "Иван Иванов" }}
      />,
    );

    const person = getPersonJsonLd();
    expect(person).toBeDefined();
    expect(person!.description).toBe("Профиль пользователя на BookStrata");
  });

  it("не добавляет knowsAbout, если он не передан", () => {
    render(
      <SEOHead
        title="Иван Иванов"
        url="/users/42"
        person={{ name: "Иван Иванов" }}
      />,
    );

    const person = getPersonJsonLd();
    expect(person).toBeDefined();
    expect(person!.knowsAbout).toBeUndefined();
  });
});
