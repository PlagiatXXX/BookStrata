# 📚 Обложки книг для шаблонов

## ✅已完成: URL заменены на локальные пути

Все 123 URL заменены на `/images/books/placeholder.webp`.

## 📋 Следующие шаги

### 1. Создай placeholder.webp (временная обложка)

Простой способ:
```bash
# Если есть ImageMagick
convert -size 400x600 xc:#4a5568 -fill white -gravity center -pointsize 48 -annotate 0 "Book\nCover" public/images/books/placeholder.webp
```

Или просто создай любой файл `placeholder.webp` в папке `public/images/books/`.

### 2. Добавь реальные обложки

Скачай обложки книг и сохрани их в `public/images/books/` с именами:

#### Бестселлеры (8 книг)
- `lotr.webp` — Властелин Колец
- `1984.webp` — 1984
- `harry-potter.webp` — Гарри Поттер
- `to-kill-mockingbird.webp` — Убить пересмешника
- `catcher-rye.webp` — Над пропастью во ржи
- `great-gatsby.webp` — Великий Гэтсби
- `lord-flies.webp` — Повелитель мух
- `crime-punishment.webp` — Преступление и наказание

#### Обязательные книги (6 книг)
- `atomic-habits.webp` — Атомные привычки
- `sapiens.webp` — Sapiens
- `thinking-fast-slow.webp` — Думай медленно
- `brief-history-time.webp` — Краткая история времени
- `rich-dad-poor-dad.webp` — Богатый папа
- `7-habits.webp` — 7 навыков

#### Фэнтези (7 книг)
- `lotr.webp` — Властелин Колец (повтор)
- `witcher.webp` — Ведьмак
- `name-wind.webp` — Имя Ветра
- `way-kings.webp` — Путь Королей
- `harry-potter.webp` — Гарри Поттер (повтор)
- `narnia.webp` — Хроники Нарнии
- `wheel-time.webp` — Колесо Времени

### 3. Обнови mockData.ts

После добавления обложек, замени `placeholder.webp` на реальные имена в файле `src/data/mockData.ts`.

Пример поиска-замены в редакторе:
- Найти: `/images/books/placeholder.webp`
- Заменить на: `/images/books/lotr.webp` (вручную для каждой книги)

## 📁 Полный список имён файлов

Смотри `BOOK_COVERS_LIST.md` для полного списка всех 91 книги.

## 💡 Совет

Можно использовать сервисы для получения обложек:
- [Open Library Covers](https://openlibrary.org/developers/coverstore)
- [Google Books API](https://developers.google.com/books)
- [Goodreads](https://www.goodreads.com/)

Или скачать обложки вручную из интернета.

## ✅ Уже есть в папке

- `bunin.webp`
- `pasternak.webp`
- `sholohov.webp`
- `prosa.webp`
- `prosa3.webp`
