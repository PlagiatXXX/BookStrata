import { describe, it, expect } from "vitest";
import { extractBooksFromHtml } from "./livelib.service.js";

describe("LiveLib HTML parser", () => {
  it("should extract books from a typical LiveLib reading list page", () => {
    const html = `
      <div id="user-objects">
        <div class="object-wrapper object-wrapper-outer object-edition">
          <div class="ll-redirect" data-link="/book/1015868566-vojna-i-mir-v-4-tomah-tom-iii-lev-tolstoj">
            <a href="/book/1015868566-vojna-i-mir-v-4-tomah-tom-iii-lev-tolstoj" title="Лев Толстой - Война и мир. В 4 томах. Том III">
              <span class="object-cover" style="background:url(https://s1.livelib.ru/boocover/1015868566/120x180/044f/boocover.jpg) no-repeat;"></span>
            </a>
            <div class="object-info">
              <div class="brow-title">
                <a href="/book/1015868566-vojna-i-mir-v-4-tomah-tom-iii-lev-tolstoj" class="title">Война и мир. В 4 томах. Том III</a>
              </div>
              <a class="description" href="/author/5497-lev-tolstoj" title="Лев Толстой">Лев Толстой</a>
            </div>
          </div>
          <div class="separator"></div>
        </div>

        <div class="object-wrapper object-wrapper-outer object-edition">
          <div class="ll-redirect" data-link="/book/1009177603-vojna-i-mir-tom-34-lev-tolstoj">
            <a href="/book/1009177603-vojna-i-mir-tom-34-lev-tolstoj" title="Лев Толстой - Война и мир. Том III-IV">
              <span class="object-cover" style="background:url(https://s1.livelib.ru/boocover/1009177603/120x180/3af8/boocover.jpg) no-repeat;"></span>
            </a>
            <div class="object-info">
              <div class="brow-title">
                <a href="/book/1009177603-vojna-i-mir-tom-34-lev-tolstoj" class="title">Война и мир. Том III-IV</a>
              </div>
              <a class="description" href="/author/5497-lev-tolstoj" title="Лев Толстой">Лев Толстой</a>
            </div>
          </div>
          <div class="separator"></div>
        </div>
      </div>
    `;

    const books = extractBooksFromHtml(html);

    expect(books).toHaveLength(2);

    expect(books[0].title).toBe("Война и мир. В 4 томах. Том III");
    expect(books[0].author).toBe("Лев Толстой");
    expect(books[0].coverImageUrl).toBe(
      "https://s1.livelib.ru/boocover/1015868566/120x180/044f/boocover.jpg",
    );
    expect(books[0].liveLibUrl).toBe(
      "/book/1015868566-vojna-i-mir-v-4-tomah-tom-iii-lev-tolstoj",
    );

    expect(books[1].title).toBe("Война и мир. Том III-IV");
    expect(books[1].author).toBe("Лев Толстой");
    expect(books[1].coverImageUrl).toBe(
      "https://s1.livelib.ru/boocover/1009177603/120x180/3af8/boocover.jpg",
    );
  });

  it("should return empty array when no book entries exist", () => {
    const html = `
      <div id="user-objects">
        <div class="block-border card-block">
          <div class="with-pad">
            <p>Этот список пока пуст.</p>
          </div>
        </div>
      </div>
    `;

    const books = extractBooksFromHtml(html);
    expect(books).toHaveLength(0);
  });

  it("should skip entries without title", () => {
    const html = `
      <div id="user-objects">
        <div class="object-wrapper object-wrapper-outer object-edition">
          <div class="ll-redirect" data-link="/book/123">
            <a href="/book/123" title="Test">
              <span class="object-cover" style="background:url(https://example.com/cover.jpg) no-repeat;"></span>
            </a>
            <div class="object-info">
              <div class="brow-title">
                <a href="/book/123" class="title"></a>
              </div>
              <a class="description" href="/author/1" title="Author">Author</a>
            </div>
          </div>
        </div>
      </div>
    `;

    const books = extractBooksFromHtml(html);
    expect(books).toHaveLength(0);
  });

  it("should handle missing author gracefully", () => {
    const html = `
      <div id="user-objects">
        <div class="object-wrapper object-wrapper-outer object-edition">
          <div class="ll-redirect" data-link="/book/456">
            <span class="object-cover" style="background:url(https://example.com/cover.jpg) no-repeat;"></span>
            <div class="object-info">
              <div class="brow-title">
                <a href="/book/456" class="title">Книга без автора</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const books = extractBooksFromHtml(html);
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe("Книга без автора");
    expect(books[0].author).toBe("");
    expect(books[0].coverImageUrl).toBe(
      "https://example.com/cover.jpg",
    );
  });

  it("should handle missing cover image", () => {
    const html = `
      <div id="user-objects">
        <div class="object-wrapper object-wrapper-outer object-edition">
          <div class="ll-redirect" data-link="/book/789">
            <span class="object-cover" style="background:url() no-repeat;"></span>
            <div class="object-info">
              <div class="brow-title">
                <a href="/book/789" class="title">Книга без обложки</a>
              </div>
              <a class="description" href="/author/2" title="Author">Автор</a>
            </div>
          </div>
        </div>
      </div>
    `;

    const books = extractBooksFromHtml(html);
    expect(books).toHaveLength(1);
    expect(books[0].coverImageUrl).toBeNull();
  });

  it("should extract books from profile page carousel (slide-book__item)", () => {
    const html = `
      <div class="profile-carousel">
        <ul class="slide-book__carousel">
          <li class="slide-book__item">
            <a class="slide-book__link" href="/book/1016063812-intrizhka-flora-kollins">
              <img data-pagespeed-lazy-src="https://s1.livelib.ru/boocover/1016063812/200/8756/boocover.jpg" alt="Интрижка">
            </a>
            <a class="slide-book__title" href="/book/1016063812-intrizhka-flora-kollins">Интрижка</a>
            <a class="slide-book__author" href="/author/1-flora-kollins">Флора Коллинз</a>
          </li>
          <li class="slide-book__item">
            <a class="slide-book__link" href="/book/1017721894-50-pravil-meril-strip-harper-lidiya">
              <img data-pagespeed-lazy-src="https://s1.livelib.ru/boocover/1017721894/200/ce22/boocover.jpg" alt="50 правил Мерил Стрип">
            </a>
            <a class="slide-book__title" href="/book/1017721894-50-pravil-meril-strip-harper-lidiya">50 правил Мерил Стрип</a>
            <a class="slide-book__author" href="/author/2-harper-lidiya">Харпер Лидия</a>
          </li>
        </ul>
      </div>
    `;

    const books = extractBooksFromHtml(html);
    expect(books).toHaveLength(2);
    expect(books[0].title).toBe("Интрижка");
    expect(books[0].author).toBe("Флора Коллинз");
    expect(books[0].coverImageUrl).toBe(
      "https://s1.livelib.ru/boocover/1016063812/200/8756/boocover.jpg",
    );
    expect(books[0].liveLibUrl).toBe(
      "/book/1016063812-intrizhka-flora-kollins",
    );
    expect(books[1].title).toBe("50 правил Мерил Стрип");
  });

  it("should prefer list page selectors over carousel when both exist", () => {
    const html = `
      <div class="object-wrapper object-edition">
        <div class="brow-title">
          <a href="/book/111" class="title">Из списка</a>
        </div>
        <a class="description" href="/author/1">Автор из списка</a>
        <span class="object-cover" style="background:url(https://example.com/list.jpg) no-repeat;"></span>
      </div>
      <ul class="slide-book__carousel">
        <li class="slide-book__item">
          <a class="slide-book__link" href="/book/222">
            <img data-pagespeed-lazy-src="https://example.com/carousel.jpg">
          </a>
          <a class="slide-book__title" href="/book/222">Из карусели</a>
        </li>
      </ul>
    `;

    const books = extractBooksFromHtml(html);
    // Должна выбрать первую книгу из основного списка, а не из карусели
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe("Из списка");
  });

  it("should work with different list view layouts", () => {
    // Некоторые страницы могут иметь другую разметку (biglist, smalltiles)
    // но базовые селекторы должны оставаться теми же
    const html = `
      <div class="object-wrapper object-edition">
        <div class="ll-redirect" data-link="/book/111">
          <span class="object-cover" style="background:url(https://example.com/c1.jpg) no-repeat;"></span>
          <div class="object-info">
            <div class="brow-title">
              <a href="/book/111" class="title">Книга 1</a>
            </div>
            <a class="description" href="/author/3">Автор 1</a>
          </div>
        </div>
      </div>
      <div class="object-wrapper object-edition">
        <div class="ll-redirect" data-link="/book/222">
          <span class="object-cover" style="background:url(https://example.com/c2.jpg) no-repeat;"></span>
          <div class="object-info">
            <div class="brow-title">
              <a href="/book/222" class="title">Книга 2</a>
            </div>
            <a class="description" href="/author/4">Автор 2</a>
          </div>
        </div>
      </div>
    `;

    const books = extractBooksFromHtml(html);
    expect(books).toHaveLength(2);
    expect(books[0].title).toBe("Книга 1");
    expect(books[1].title).toBe("Книга 2");
  });
});
