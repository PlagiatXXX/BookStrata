/**
 * Seed коллекций — standalone JS для production.
 * Запускать: docker compose exec -w /app app node scripts/seed-collections.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function toPrisma(col) {
  const data = {
    slug: col.slug,
    title: col.title,
    type: col.type,
    content: col.content || null,
    excerpt: col.excerpt || null,
    coverImageUrl: col.coverImageUrl,
    bookCovers: col.bookCovers,
    tags: col.tags,
    isPublished: col.isPublished,
    order: col.order,
    tierOrder: col.tierOrder || [],
    unrankedBookIds: col.unrankedBookIds || [],
  };
  // Prisma не принимает null для JSON-полей — добавляем только когда есть значение
  if (col.tiers !== undefined) data.tiers = col.tiers;
  if (col.books !== undefined) data.books = col.books;
  return data;
}

const collectionSeeds = [
  // ===== Literary =====
  {
    slug: "nobel-laureates",
    title: "Лауреаты Нобелевской премии",
    type: "literary",
    content: `<h2>Нобелевская премия по литературе</h2>
<p>Нобелевская премия по литературе — одна из самых престижных наград в мире...</p>
<h3>Русские лауреаты</h3>
<ul>
  <li><strong>Иван Бунин (1933)</strong> — первый русский писатель, получивший Нобелевскую премию.</li>
  <li><strong>Борис Пастернак (1958)</strong> — награждён за роман «Доктор Живаго».</li>
  <li><strong>Михаил Шолохов (1965)</strong> — получил премию за «Тихий Дон».</li>
  <li><strong>Александр Солженицын (1970)</strong> — награждён за «Архипелаг ГУЛАГ».</li>
  <li><strong>Иосиф Бродский (1987)</strong> — за поэзию.</li>
</ul>
<h3>Известные лауреаты разных лет</h3>
<ul>
  <li><strong>Эрнест Хемингуэй (1954)</strong></li>
  <li><strong>Габриэль Гарсиа Маркес (1982)</strong></li>
  <li><strong>Тони Моррисон (1993)</strong></li>
  <li><strong>Кадзуо Исигуро (2017)</strong></li>
</ul>`,
    excerpt: "Полная история русских и зарубежных лауреатов Нобелевской премии по литературе.",
    coverImageUrl: "/images/collections/literary/nobel-prize.webp",
    bookCovers: ["/images/books/bunin-medium.webp", "/images/books/pasternak-medium.webp", "/images/books/sholohov-medium.webp"],
    tags: ["Нобелевская премия", "Классика", "Лауреаты"],
    isPublished: true,
    order: 1,
  },
  {
    slug: "favorites-bookstrata",
    title: "Фавориты BookStrata",
    type: "literary",
    content: `<h2>Выбор сообщества BookStrata</h2>
<p>Эта подборка создана на основе голосов и рекомендаций нашего сообщества.</p>
<h3>Топ-5 книг месяца</h3>
<ol>
  <li><strong>«Шантарам» Грегори Дэвид Робертс</strong> — приключенческий роман.</li>
  <li><strong>«Тень ветра» Карлос Руис Сафон</strong> — мистический триллер.</li>
  <li><strong>«Ночной цирк» Эрин Моргенштерн</strong> — волшебная история.</li>
  <li><strong>«Щегол» Донна Тартт</strong> — роман о взрослении.</li>
  <li><strong>«Бегущий за ветром» Халед Хоссейни</strong> — история дружбы.</li>
</ol>`,
    excerpt: "Книги, которые получили высшие оценки от сообщества BookStrata.",
    coverImageUrl: "/images/collections/literary/2026-hero.webp",
    bookCovers: ["/images/books/shantaram.webp", "/images/books/shadow-wind.webp", "/images/books/circus.webp"],
    tags: ["Популярное", "Выбор читателей", "Топ"],
    isPublished: true,
    order: 2,
  },
  {
    slug: "historical-prose",
    title: "Историческая проза",
    type: "literary",
    content: `<h2>Лучшие произведения в жанре исторической прозы</h2>
<p>Историческая проза — это литературные произведения, в которых действие происходит в прошлом.</p>
<h3>Классика жанра</h3>
<ul>
  <li><strong>«Война и мир» Лев Толстой</strong> — эпоха наполеоновских войн.</li>
  <li><strong>«Анна Каренина» Лев Толстой</strong> — история любви XIX века.</li>
  <li><strong>«Имя розы» Умберто Эко</strong> — философский детектив.</li>
</ul>`,
    excerpt: "Погрузитесь в разные эпохи через лучшие произведения исторической прозы.",
    coverImageUrl: "/images/collections/literary/prosa-hero.webp",
    bookCovers: ["/images/books/prosa-medium.webp", "/images/books/prosa1-medium.webp", "/images/books/prosa3-medium.webp"],
    tags: ["Историческая проза", "Классика", "Современная литература"],
    isPublished: true,
    order: 3,
  },
  // ===== Curated =====
  {
    slug: "top-fantasy",
    title: "Топ книг фэнтези — рейтинг лучших",
    type: "curated",
    excerpt: "Лучшие книги в жанре фэнтези: от классики Толкина до современных бестселлеров.",
    coverImageUrl: "/images/collections/curated/top-fantasy/mistborn.jpeg",
    bookCovers: ["/images/books/vlastelin-kolets.webp", "/images/books/garri-potter-i-filosofskiy-kamen.webp", "/images/books/igra-prestolov.webp"],
    tags: ["Фэнтези", "Эпическое фэнтези", "Магия", "Приключения"],
    isPublished: true,
    order: 10,
    tiers: { s: { id: "s", title: "Шедевр", color: "#ef4444", bookIds: ["b1", "b2"] }, a: { id: "a", title: "Отлично", color: "#f97316", bookIds: ["b3", "b4"] }, b: { id: "b", title: "Хорошо", color: "#eab308", bookIds: ["b5"] }, c: { id: "c", title: "Средне", color: "#84cc16", bookIds: ["b6"] } },
    tierOrder: ["s", "a", "b", "c"],
    books: {
      b1: { id: "b1", title: "Властелин Колец", author: "Дж. Р. Р. Толкин", coverImageUrl: "/images/books/vlastelin-kolets.webp", description: "Эпическое фэнтези о хоббите Фродо, несущем Кольцо Всевластия в Роковую гору." },
      b2: { id: "b2", title: "Гарри Поттер и философский камень", author: "Дж. К. Роулинг", coverImageUrl: "/images/books/garri-potter-i-filosofskiy-kamen.webp", description: "Первая книга о мальчике-волшебнике." },
      b3: { id: "b3", title: "Игра престолов", author: "Джордж Р. Р. Мартин", coverImageUrl: "/images/books/igra-prestolov.webp", description: "Политические интриги в мире Вестероса." },
      b4: { id: "b4", title: "Хроники Нарнии", author: "К. С. Льюис", coverImageUrl: "/images/books/narnia.webp", description: "Дети попадают в волшебную страну через платяной шкаф." },
      b5: { id: "b5", title: "Имя ветра", author: "Патрик Ротфусс", coverImageUrl: "/images/books/imya-vetra.webp", description: "История Квоута — мага, вора и музыканта." },
      b6: { id: "b6", title: "Ведьмак", author: "Анджей Сапковский", coverImageUrl: "/images/books/vedmak.webp", description: "Охотник на чудовищ в мире славянских легенд." },
    },
    unrankedBookIds: [],
  },
  {
    slug: "top-detective",
    title: "Топ детективов и триллеров — рейтинг книг",
    type: "curated",
    excerpt: "Захватывающие детективы и триллеры, которые держат в напряжении до последней страницы.",
    coverImageUrl: "/images/collections/curated/top-detective/intruder.jpg",
    bookCovers: ["/images/books/ubit-peresmeshnika.webp", "/images/books/prestuplenie-i-nakazanie.webp", "/images/books/shadow-wind.webp"],
    tags: ["Детективы", "Триллеры", "Мистика", "Криминал", "Психология"],
    isPublished: true,
    order: 11,
    tiers: { s: { id: "s", title: "Шедевр", color: "#ef4444", bookIds: ["b1", "b2"] }, a: { id: "a", title: "Отлично", color: "#f97316", bookIds: ["b3", "b4"] }, b: { id: "b", title: "Хорошо", color: "#eab308", bookIds: ["b5"] }, c: { id: "c", title: "Средне", color: "#84cc16", bookIds: ["b6"] } },
    tierOrder: ["s", "a", "b", "c"],
    books: {
      b1: { id: "b1", title: "Убить пересмешника", author: "Харпер Ли", coverImageUrl: "/images/books/ubit-peresmeshnika.webp", description: "Классика американской литературы о расовой несправедливости." },
      b2: { id: "b2", title: "Преступление и наказание", author: "Ф. М. Достоевский", coverImageUrl: "/images/books/prestuplenie-i-nakazanie.webp", description: "Философский детектив о студенте-убийце." },
      b3: { id: "b3", title: "Тень ветра", author: "Карлос Руис Сафон", coverImageUrl: "/images/books/shadow-wind.webp", description: "Мистический детектив в послевоенной Барселоне." },
      b4: { id: "b4", title: "Десять негритят", author: "Агата Кристи", coverImageUrl: "/images/books/desyat-negrityat.webp", description: "Самый продаваемый детектив всех времён." },
      b5: { id: "b5", title: "Молчание ягнят", author: "Томас Харрис", coverImageUrl: "/images/books/molchanie-yagnyat.webp", description: "Психологический триллер о профайлере и маньяке." },
      b6: { id: "b6", title: "Шерлок Холмс", author: "Артур Конан Дойл", coverImageUrl: "/images/books/sherlok-kholms.webp", description: "Легендарные рассказы о великом сыщике." },
    },
    unrankedBookIds: [],
  },
  {
    slug: "top-romance",
    title: "Топ романов — рейтинг",
    type: "curated",
    excerpt: "Лучшие романы мировой литературы: от любовных драм до философских эпопей.",
    coverImageUrl: "/images/collections/curated/top-romance/beautiful-life.jpg",
    bookCovers: ["/images/collections/curated/top-romance/beautiful-life.jpg", "/images/collections/curated/top-romance/favorite.jpeg", "/images/collections/curated/top-romance/love-arranged.jpg"],
    tags: ["Романы", "Классика", "Современная проза", "Бестселлеры"],
    isPublished: false,
    order: 12,
    tiers: { s: { id: "s", title: "Шедевр", color: "#ef4444", bookIds: ["tr1", "tr2", "tr3", "tr4", "tr5"] }, a: { id: "a", title: "Отлично", color: "#f97316", bookIds: ["tr6", "tr7", "tr8", "tr9", "tr10"] }, b: { id: "b", title: "Хорошо", color: "#eab308", bookIds: ["tr11", "tr12", "tr13", "tr14", "tr15"] }, c: { id: "c", title: "Средне", color: "#84cc16", bookIds: ["tr16", "tr17", "tr18", "tr19", "tr20"] } },
    tierOrder: ["s", "a", "b", "c"],
    books: {
      tr1: { id: "tr1", title: "Beautiful Life", author: "", coverImageUrl: "/images/collections/curated/top-romance/beautiful-life.jpg", description: "" },
      tr2: { id: "tr2", title: "Favorite", author: "", coverImageUrl: "/images/collections/curated/top-romance/favorite.jpeg", description: "" },
      tr3: { id: "tr3", title: "King of Elvy", author: "", coverImageUrl: "/images/collections/curated/top-romance/king-elvy.jpeg", description: "" },
      tr4: { id: "tr4", title: "Love Arranged", author: "", coverImageUrl: "/images/collections/curated/top-romance/love-arranged.jpg", description: "" },
      tr5: { id: "tr5", title: "Story of Life", author: "", coverImageUrl: "/images/collections/curated/top-romance/story-life.jpeg", description: "" },
      tr6: { id: "tr6", title: "Golden Summer", author: "", coverImageUrl: "/images/collections/curated/top-romance/golden-summer.jpeg", description: "" },
      tr7: { id: "tr7", title: "Makes Happy", author: "", coverImageUrl: "/images/collections/curated/top-romance/makes-happy.jpeg", description: "" },
      tr8: { id: "tr8", title: "Remember", author: "", coverImageUrl: "/images/collections/curated/top-romance/remember.jpeg", description: "" },
      tr9: { id: "tr9", title: "Rewind Back", author: "", coverImageUrl: "/images/collections/curated/top-romance/rewind-back.jpeg", description: "" },
      tr10: { id: "tr10", title: "Season", author: "", coverImageUrl: "/images/collections/curated/top-romance/season.jpeg", description: "" },
      tr11: { id: "tr11", title: "Bread Berary", author: "", coverImageUrl: "/images/collections/curated/top-romance/bread-berary.jpg", description: "" },
      tr12: { id: "tr12", title: "The Caller", author: "", coverImageUrl: "/images/collections/curated/top-romance/caller.jpg", description: "" },
      tr13: { id: "tr13", title: "Deep End", author: "", coverImageUrl: "/images/collections/curated/top-romance/deep-end.jpg", description: "" },
      tr14: { id: "tr14", title: "Problem Roman", author: "", coverImageUrl: "/images/collections/curated/top-romance/problem-roman.jpg", description: "" },
      tr15: { id: "tr15", title: "Scythe", author: "", coverImageUrl: "/images/collections/curated/top-romance/scythe.jpeg", description: "" },
      tr16: { id: "tr16", title: "Deg Borrow", author: "", coverImageUrl: "/images/collections/curated/top-romance/deg-borrow.jpg", description: "" },
      tr17: { id: "tr17", title: "Enough", author: "", coverImageUrl: "/images/collections/curated/top-romance/enough.jpg", description: "" },
      tr18: { id: "tr18", title: "Spiral", author: "", coverImageUrl: "/images/collections/curated/top-romance/spiral.jpg", description: "" },
      tr19: { id: "tr19", title: "Summer Part", author: "", coverImageUrl: "/images/collections/curated/top-romance/summer-part.jpeg", description: "" },
      tr20: { id: "tr20", title: "Wild Side", author: "", coverImageUrl: "/images/collections/curated/top-romance/wild-side.jpeg", description: "" },
    },
    unrankedBookIds: [],
  },
  {
    slug: "top-fantastic",
    title: "Топ книг фантастика — рейтинг",
    type: "curated",
    excerpt: "Классика и современность: лучшие научно-фантастические романы, расширяющие границы воображения.",
    coverImageUrl: "/images/collections/curated/top-fantastic/carl.jpeg",
    bookCovers: ["/images/books/1984.webp", "/images/books/bradbury-451.webp", "/images/books/strugatsky.webp"],
    tags: ["Фантастика", "Sci-Fi", "Классика", "Киберпанк"],
    isPublished: true,
    order: 13,
    tiers: { s: { id: "s", title: "Шедевр", color: "#ef4444", bookIds: ["b1", "b2"] }, a: { id: "a", title: "Отлично", color: "#f97316", bookIds: ["b3", "b4"] }, b: { id: "b", title: "Хорошо", color: "#eab308", bookIds: ["b5"] }, c: { id: "c", title: "Средне", color: "#84cc16", bookIds: ["b6"] } },
    tierOrder: ["s", "a", "b", "c"],
    books: {
      b1: { id: "b1", title: "1984", author: "Джордж Оруэлл", coverImageUrl: "/images/books/1984.webp", description: "Роман-антиутопия о тоталитарном будущем." },
      b2: { id: "b2", title: "451° по Фаренгейту", author: "Рэй Брэдбери", coverImageUrl: "/images/books/bradbury-451.webp", description: "Мир, где книги запрещены и сжигаются." },
      b3: { id: "b3", title: "Пикник на обочине", author: "Стругацкие", coverImageUrl: "/images/books/strugatsky.webp", description: "Зона — место, где сбываются мечты и рушатся судьбы." },
      b4: { id: "b4", title: "Автостопом по галактике", author: "Дуглас Адамс", coverImageUrl: "/images/books/avtostopom.webp", description: "Юмористическая фантастика о путешествиях по космосу." },
      b5: { id: "b5", title: "Нейромант", author: "Уильям Гибсон", coverImageUrl: "/images/books/neiromant.webp", description: "Классика киберпанка, определившая жанр." },
      b6: { id: "b6", title: "О дивный новый мир", author: "Олдос Хаксли", coverImageUrl: "/images/books/o-divnyy-novyy-mir.webp", description: "Антиутопия о мире потребления и генной инженерии." },
    },
    unrankedBookIds: [],
  },
  {
    slug: "top-popadantsy",
    title: "Топ книг попаданцы — рейтинг",
    type: "curated",
    excerpt: "Лучшие книги в жанре попаданцев: из нашего мира в магические миры, прошлое и будущее.",
    coverImageUrl: "/images/templates/default.webp",
    bookCovers: ["/images/placeholder-cover.svg"],
    tags: ["Попаданцы", "Фэнтези", "Приключения", "Магия"],
    isPublished: false,
    order: 14,
  },
  {
    slug: "horror-books",
    title: "Топ книг ужасов и мистики — рейтинг",
    type: "curated",
    excerpt: "Лучшие книги в жанре ужасов и мистики: от классических хорроров до современных мистических триллеров.",
    coverImageUrl: "/images/collections/curated/horror-books/frankenshtein.jpeg",
    bookCovers: ["/images/collections/curated/horror-books/frankenshtein.jpeg", "/images/collections/curated/horror-books/darkness.jpeg", "/images/collections/curated/horror-books/strange-pictures.jpg"],
    tags: ["Ужасы", "Мистика", "Хоррор", "Триллеры"],
    isPublished: false,
    order: 15,
    tiers: { s: { id: "s", title: "Шедевр", color: "#ef4444", bookIds: ["h1", "h2", "h3"] }, a: { id: "a", title: "Отлично", color: "#f97316", bookIds: ["h4", "h5", "h6"] }, b: { id: "b", title: "Хорошо", color: "#eab308", bookIds: ["h7", "h8", "h9"] }, c: { id: "c", title: "Средне", color: "#84cc16", bookIds: ["h10", "h11", "h12"] } },
    tierOrder: ["s", "a", "b", "c"],
    books: {
      h1: { id: "h1", title: "Frankenstein", author: "", coverImageUrl: "/images/collections/curated/horror-books/frankenshtein.jpeg", description: "" },
      h2: { id: "h2", title: "Darkness", author: "", coverImageUrl: "/images/collections/curated/horror-books/darkness.jpeg", description: "" },
      h3: { id: "h3", title: "Strange Pictures", author: "", coverImageUrl: "/images/collections/curated/horror-books/strange-pictures.jpg", description: "" },
      h4: { id: "h4", title: "Hidden Pictures", author: "", coverImageUrl: "/images/collections/curated/horror-books/hidden-pictures.jpeg", description: "" },
      h5: { id: "h5", title: "Rabbit", author: "", coverImageUrl: "/images/collections/curated/horror-books/rabbit.jpeg", description: "" },
      h6: { id: "h6", title: "Play Nice", author: "", coverImageUrl: "/images/collections/curated/horror-books/play-nice.jpg", description: "" },
      h7: { id: "h7", title: "Live Here", author: "", coverImageUrl: "/images/collections/curated/horror-books/live-here.jpeg", description: "" },
      h8: { id: "h8", title: "Long", author: "", coverImageUrl: "/images/collections/curated/horror-books/long.jpeg", description: "" },
      h9: { id: "h9", title: "Crady", author: "", coverImageUrl: "/images/collections/curated/horror-books/crady.jpg", description: "" },
      h10: { id: "h10", title: "Ad", author: "", coverImageUrl: "/images/collections/curated/horror-books/ad.jpg", description: "" },
      h11: { id: "h11", title: "Buffalo", author: "", coverImageUrl: "/images/collections/curated/horror-books/buffalo.jpeg", description: "" },
      h12: { id: "h12", title: "Flesh", author: "", coverImageUrl: "/images/collections/curated/horror-books/flesh.jpeg", description: "" },
    },
    unrankedBookIds: [],
  },
  {
    slug: "romantic-fantasy",
    title: "Романтическое фэнтези — рейтинг книг",
    type: "curated",
    excerpt: "Лучшие книги в жанре романтического фэнтези: магия, любовь, приключения и судьбы.",
    coverImageUrl: "/images/collections/curated/romantic-fantasy/court-fure.jpeg",
    bookCovers: ["/images/collections/curated/romantic-fantasy/court-fure.jpeg", "/images/collections/curated/romantic-fantasy/court-rose.jpeg", "/images/collections/curated/romantic-fantasy/court-ruin.jpeg"],
    tags: ["Романтическое фэнтези", "Ромфант", "Любовное фэнтези", "Магия"],
    isPublished: false,
    order: 16,
    tiers: { s: { id: "s", title: "Шедевр", color: "#ef4444", bookIds: ["rf1", "rf2", "rf3"] }, a: { id: "a", title: "Отлично", color: "#f97316", bookIds: ["rf4", "rf5", "rf6"] }, b: { id: "b", title: "Хорошо", color: "#eab308", bookIds: ["rf7", "rf8", "rf9"] }, c: { id: "c", title: "Средне", color: "#84cc16", bookIds: ["rf10", "rf11", "rf12"] } },
    tierOrder: ["s", "a", "b", "c"],
    books: {
      rf1: { id: "rf1", title: "House of Flame and Shadow", author: "", coverImageUrl: "/images/collections/curated/romantic-fantasy/court-fure.jpeg", description: "" },
      rf2: { id: "rf2", title: "House of Sky and Breath", author: "", coverImageUrl: "/images/collections/curated/romantic-fantasy/court-rose.jpeg", description: "" },
      rf3: { id: "rf3", title: "House of Earth and Blood", author: "", coverImageUrl: "/images/collections/curated/romantic-fantasy/court-ruin.jpeg", description: "" },
      rf4: { id: "rf4", title: "The Alchemised", author: "", coverImageUrl: "/images/collections/curated/romantic-fantasy/alchemisen.jpeg", description: "" },
      rf5: { id: "rf5", title: "Iron Flame", author: "", coverImageUrl: "/images/collections/curated/romantic-fantasy/iron-fire.jpeg", description: "" },
      rf6: { id: "rf6", title: "Rites of the Starling", author: "", coverImageUrl: "/images/collections/curated/romantic-fantasy/rites-starling.jpeg", description: "" },
      rf7: { id: "rf7", title: "The Mate", author: "", coverImageUrl: "/images/collections/curated/romantic-fantasy/mate.jpg", description: "" },
      rf8: { id: "rf8", title: "Onix", author: "", coverImageUrl: "/images/collections/curated/romantic-fantasy/onix.jpeg", description: "" },
      rf9: { id: "rf9", title: "Sera", author: "", coverImageUrl: "/images/collections/curated/romantic-fantasy/sera.jpg", description: "" },
      rf10: { id: "rf10", title: "Rtut", author: "", coverImageUrl: "/images/collections/curated/romantic-fantasy/rtut.jpeg", description: "" },
      rf11: { id: "rf11", title: "Shield of Sparrows", author: "", coverImageUrl: "/images/collections/curated/romantic-fantasy/shield-sparrows.jpeg", description: "" },
      rf12: { id: "rf12", title: "Wing", author: "", coverImageUrl: "/images/collections/curated/romantic-fantasy/wing.jpeg", description: "" },
    },
    unrankedBookIds: [],
  },
  {
    slug: "best-books-2026",
    title: "Топ книг 2026 — рейтинг лучших",
    type: "curated",
    excerpt: "Лучшие книги 2026 года по версии читателей и критиков — новинки и главные бестселлеры.",
    coverImageUrl: "/images/templates/default.webp",
    bookCovers: ["/images/placeholder-cover.svg"],
    tags: ["2026", "Новинки", "Бестселлеры", "Современное"],
    isPublished: false,
    order: 17,
  },
  {
    slug: "summer-reading",
    title: "Что почитать летом — подборка книг",
    type: "curated",
    excerpt: "Летняя подборка книг для отдыха, путешествий и вдохновения.",
    coverImageUrl: "/images/templates/default.webp",
    bookCovers: ["/images/placeholder-cover.svg"],
    tags: ["Лето", "Летнее чтение", "Подборка", "Отпуск"],
    isPublished: false,
    order: 18,
  },
  {
    slug: "popular-science",
    title: "Топ научно-популярных книг — рейтинг",
    type: "curated",
    excerpt: "Лучшие научно-популярные книги: от эволюции и космоса до нейробиологии и квантовой физики.",
    coverImageUrl: "/images/collections/curated/popular-science/atomic.jpeg",
    bookCovers: ["/images/collections/curated/popular-science/atomic.jpeg", "/images/collections/curated/popular-science/anthropocene.jpeg", "/images/collections/curated/popular-science/serviceberry.jpg"],
    tags: ["Научно-популярная литература", "Нон-фикшн", "Наука", "Популяризация науки"],
    isPublished: false,
    order: 19,
    tiers: { s: { id: "s", title: "Шедевр", color: "#ef4444", bookIds: ["p1", "p2", "p3"] }, a: { id: "a", title: "Отлично", color: "#f97316", bookIds: ["p4", "p5", "p6"] }, b: { id: "b", title: "Хорошо", color: "#eab308", bookIds: ["p7", "p8", "p9"] }, c: { id: "c", title: "Средне", color: "#84cc16", bookIds: ["p10", "p11", "p12"] } },
    tierOrder: ["s", "a", "b", "c"],
    books: {
      p1: { id: "p1", title: "Atomic Habits", author: "", coverImageUrl: "/images/collections/curated/popular-science/atomic.jpeg", description: "" },
      p2: { id: "p2", title: "The Anthropocene Reviewed", author: "", coverImageUrl: "/images/collections/curated/popular-science/anthropocene.jpeg", description: "" },
      p3: { id: "p3", title: "The Serviceberry", author: "", coverImageUrl: "/images/collections/curated/popular-science/serviceberry.jpg", description: "" },
      p4: { id: "p4", title: "Anxious People", author: "", coverImageUrl: "/images/collections/curated/popular-science/anxious.jpeg", description: "" },
      p5: { id: "p5", title: "The Museum of Vor", author: "", coverImageUrl: "/images/collections/curated/popular-science/museum-vor.jpeg", description: "" },
      p6: { id: "p6", title: "Tuberculosis", author: "", coverImageUrl: "/images/collections/curated/popular-science/tuberculosis.jpeg", description: "" },
      p7: { id: "p7", title: "Let Them", author: "", coverImageUrl: "/images/collections/curated/popular-science/let-them.jpeg", description: "" },
      p8: { id: "p8", title: "London Falling", author: "", coverImageUrl: "/images/collections/curated/popular-science/london-falling.jpeg", description: "" },
      p9: { id: "p9", title: "Mans", author: "", coverImageUrl: "/images/collections/curated/popular-science/mans.jpeg", description: "" },
      p10: { id: "p10", title: "One Day", author: "", coverImageUrl: "/images/collections/curated/popular-science/one-day.jpg", description: "" },
      p11: { id: "p11", title: "Pofigism", author: "", coverImageUrl: "/images/collections/curated/popular-science/pofigism.png", description: "" },
      p12: { id: "p12", title: "Psi Money", author: "", coverImageUrl: "/images/collections/curated/popular-science/psi-money.jpeg", description: "" },
    },
    unrankedBookIds: [],
  },
  {
    slug: "what-to-read-interesting",
    title: "Что почитать интересного — подборка",
    type: "curated",
    excerpt: "Увлекательные книги на любой вкус — от бестселлеров до скрытых жемчужин.",
    coverImageUrl: "/images/templates/default.webp",
    bookCovers: ["/images/placeholder-cover.svg"],
    tags: ["Что почитать", "Интересное", "Подборка", "Рекомендации"],
    isPublished: false,
    order: 20,
  },
  {
    slug: "must-read",
    title: "Книги которые должен прочитать каждый",
    type: "curated",
    excerpt: "Культовые произведения, которые стоит прочитать каждому хотя бы раз в жизни.",
    coverImageUrl: "/images/templates/Classics.webp",
    bookCovers: ["/images/placeholder-cover.svg"],
    tags: ["Must read", "Обязательное", "Классика", "Важное"],
    isPublished: false,
    order: 21,
  },
  {
    slug: "best-books-ever",
    title: "Лучшие книги всех времён — рейтинг",
    type: "curated",
    excerpt: "Произведения, которые остаются актуальными через столетия — от античности до XX века.",
    coverImageUrl: "/images/templates/Classics.webp",
    bookCovers: ["/images/books/voyna-i-mir.webp", "/images/books/anna-karenina.webp", "/images/books/master-i-margarita.webp"],
    tags: ["Лучшие книги", "Классика", "Мировая литература", "Шедевры"],
    isPublished: true,
    order: 22,
    tiers: { s: { id: "s", title: "Вершина", color: "#ef4444", bookIds: ["b1", "b2"] }, a: { id: "a", title: "Шедевр", color: "#f97316", bookIds: ["b3", "b4"] }, b: { id: "b", title: "Классика", color: "#eab308", bookIds: ["b5"] }, c: { id: "c", title: "Значимо", color: "#84cc16", bookIds: ["b6"] } },
    tierOrder: ["s", "a", "b", "c"],
    books: {
      b1: { id: "b1", title: "Война и мир", author: "Лев Толстой", coverImageUrl: "/images/books/voyna-i-mir.webp", description: "Эпический роман о России в эпоху наполеоновских войн." },
      b2: { id: "b2", title: "Анна Каренина", author: "Лев Толстой", coverImageUrl: "/images/books/anna-karenina.webp", description: "Трагическая история любви в высшем свете Петербурга." },
      b3: { id: "b3", title: "Мастер и Маргарита", author: "Михаил Булгаков", coverImageUrl: "/images/books/master-i-margarita.webp", description: "Мистический роман о добре и зле в советской Москве." },
      b4: { id: "b4", title: "Преступление и наказание", author: "Ф. М. Достоевский", coverImageUrl: "/images/books/prestuplenie-i-nakazanie.webp", description: "Философская драма о морали и искуплении." },
      b5: { id: "b5", title: "Братья Карамазовы", author: "Ф. М. Достоевский", coverImageUrl: "/images/books/bratya-karamazovy.webp", description: "Роман о вере, сомнении и семейных узах." },
      b6: { id: "b6", title: "Сто лет одиночества", author: "Габриэль Гарсиа Маркес", coverImageUrl: "/images/books/sto-let-odinochestva.webp", description: "Вершина магического реализма." },
    },
    unrankedBookIds: [],
  },
  {
    slug: "what-to-read-children",
    title: "Что почитать детям — список",
    type: "curated",
    excerpt: "Лучшие книги для детей — от сказок до подростковых романов.",
    coverImageUrl: "/images/templates/default.webp",
    bookCovers: ["/images/placeholder-cover.svg"],
    tags: ["Детская литература", "Сказки", "Подростковое"],
    isPublished: false,
    order: 23,
  },
  {
    slug: "historical-novels",
    title: "Топ исторических романов — рейтинг книг",
    type: "curated",
    excerpt: "Лучшие исторические романы: от античности до XX века, от классики до современных бестселлеров.",
    coverImageUrl: "/images/collections/curated/historical-novels/hamnet.jpeg",
    bookCovers: ["/images/collections/curated/historical-novels/hamnet.jpeg", "/images/collections/curated/historical-novels/imperia.jpeg", "/images/collections/curated/historical-novels/james.png"],
    tags: ["Исторические романы", "Историческая проза", "Классика", "Приключения"],
    isPublished: false,
    order: 24,
    tiers: { s: { id: "s", title: "Шедевр", color: "#ef4444", bookIds: ["hn1", "hn2", "hn3", "hn4", "hn5"] }, a: { id: "a", title: "Отлично", color: "#f97316", bookIds: ["hn6", "hn7", "hn8", "hn9", "hn10"] }, b: { id: "b", title: "Хорошо", color: "#eab308", bookIds: ["hn11", "hn12", "hn13", "hn14", "hn15"] }, c: { id: "c", title: "Средне", color: "#84cc16", bookIds: ["hn16", "hn17", "hn18", "hn19", "hn20"] } },
    tierOrder: ["s", "a", "b", "c"],
    books: {
      hn1: { id: "hn1", title: "Hamnet", author: "", coverImageUrl: "/images/collections/curated/historical-novels/hamnet.jpeg", description: "" },
      hn2: { id: "hn2", title: "Imperia", author: "", coverImageUrl: "/images/collections/curated/historical-novels/imperia.jpeg", description: "" },
      hn3: { id: "hn3", title: "James", author: "", coverImageUrl: "/images/collections/curated/historical-novels/james.png", description: "" },
      hn4: { id: "hn4", title: "Radium", author: "", coverImageUrl: "/images/collections/curated/historical-novels/radium.jpeg", description: "" },
      hn5: { id: "hn5", title: "The Wager", author: "", coverImageUrl: "/images/collections/curated/historical-novels/wager.jpeg", description: "" },
      hn6: { id: "hn6", title: "Bright Young Years", author: "", coverImageUrl: "/images/collections/curated/historical-novels/bright-years.jpeg", description: "" },
      hn7: { id: "hn7", title: "Killers", author: "", coverImageUrl: "/images/collections/curated/historical-novels/killers.jpeg", description: "" },
      hn8: { id: "hn8", title: "Mad Wife", author: "", coverImageUrl: "/images/collections/curated/historical-novels/mad-wife.jpg", description: "" },
      hn9: { id: "hn9", title: "River", author: "", coverImageUrl: "/images/collections/curated/historical-novels/river.jpeg", description: "" },
      hn10: { id: "hn10", title: "Seven", author: "", coverImageUrl: "/images/collections/curated/historical-novels/seven.jpeg", description: "" },
      hn11: { id: "hn11", title: "Alone", author: "", coverImageUrl: "/images/collections/curated/historical-novels/alone.jpeg", description: "" },
      hn12: { id: "hn12", title: "Buckeye", author: "", coverImageUrl: "/images/collections/curated/historical-novels/buckeye.jpg", description: "" },
      hn13: { id: "hn13", title: "Family", author: "", coverImageUrl: "/images/collections/curated/historical-novels/family.jpg", description: "" },
      hn14: { id: "hn14", title: "November", author: "", coverImageUrl: "/images/collections/curated/historical-novels/november.jpg", description: "" },
      hn15: { id: "hn15", title: "Sapiens", author: "", coverImageUrl: "/images/collections/curated/historical-novels/sapiens.jpg", description: "" },
      hn16: { id: "hn16", title: "1929", author: "", coverImageUrl: "/images/collections/curated/historical-novels/1929.jpeg", description: "" },
      hn17: { id: "hn17", title: "Kill Witch", author: "", coverImageUrl: "/images/collections/curated/historical-novels/kill-witch.jpeg", description: "" },
      hn18: { id: "hn18", title: "Marriage of the Sea", author: "", coverImageUrl: "/images/collections/curated/historical-novels/marrige-sea.jpg", description: "" },
      hn19: { id: "hn19", title: "Say Nothing", author: "", coverImageUrl: "/images/collections/curated/historical-novels/say-nothing.jpeg", description: "" },
      hn20: { id: "hn20", title: "Tiran", author: "", coverImageUrl: "/images/collections/curated/historical-novels/tiran.png", description: "" },
    },
    unrankedBookIds: [],
  },
  {
    slug: "best-books-list",
    title: "Список лучших книг — рейтинг",
    type: "curated",
    excerpt: "Книги, которые меняют мышление: от научных открытий до саморазвития.",
    coverImageUrl: "/images/templates/default.webp",
    bookCovers: ["/images/placeholder-cover.svg"],
    tags: ["Список лучших", "Нон-фикшн", "Саморазвитие", "Психология"],
    isPublished: false,
    order: 25,
  },
  {
    slug: "top-100-books",
    title: "Топ 100 книг — список лучших",
    type: "curated",
    excerpt: "Сто лучших книг всех времён по версии BookStrata — главные произведения мировой литературы.",
    coverImageUrl: "/images/templates/default.webp",
    bookCovers: ["/images/placeholder-cover.svg"],
    tags: ["Топ 100", "Лучшие книги", "Список", "Must read"],
    isPublished: false,
    order: 26,
  },
  {
    slug: "high-rated-books",
    title: "Книги с высоким рейтингом",
    type: "curated",
    excerpt: "Книги, получившие самые высокие оценки читателей BookStrata.",
    coverImageUrl: "/images/templates/default.webp",
    bookCovers: ["/images/placeholder-cover.svg"],
    tags: ["Высокий рейтинг", "Лучшие", "Читательский выбор"],
    isPublished: false,
    order: 27,
  },
  {
    slug: "russian-books",
    title: "Топ русских книг — рейтинг",
    type: "curated",
    excerpt: "Великие произведения русских писателей, изменившие мировую литературу.",
    coverImageUrl: "/images/templates/default.webp",
    bookCovers: ["/images/placeholder-cover.svg"],
    tags: ["Русские книги", "Русская классика", "XIX век", "Современное"],
    isPublished: false,
    order: 30,
  },
  {
    slug: "romantic-stories",
    title: "Топ романтических историй — рейтинг",
    type: "curated",
    excerpt: "Трогательные и красивые истории о любви — от классических романов до современных бестселлеров.",
    coverImageUrl: "/images/collections/curated/romantic-stories/enchantra.jpeg",
    bookCovers: ["/images/collections/curated/romantic-stories/enchantra.jpeg", "/images/collections/curated/romantic-stories/hercules.jpeg", "/images/collections/curated/romantic-stories/immortal.jpg"],
    tags: ["Романтика", "Любовные истории", "Чувства", "Отношения"],
    isPublished: false,
    order: 31,
    tiers: { s: { id: "s", title: "Шедевр", color: "#ef4444", bookIds: ["rs1", "rs2", "rs3", "rs4", "rs5"] }, a: { id: "a", title: "Отлично", color: "#f97316", bookIds: ["rs6", "rs7", "rs8", "rs9", "rs10"] }, b: { id: "b", title: "Хорошо", color: "#eab308", bookIds: ["rs11", "rs12", "rs13", "rs14", "rs15"] }, c: { id: "c", title: "Средне", color: "#84cc16", bookIds: ["rs16", "rs17", "rs18", "rs19", "rs20"] } },
    tierOrder: ["s", "a", "b", "c"],
    books: {
      rs1: { id: "rs1", title: "Enchantra", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/enchantra.jpeg", description: "" },
      rs2: { id: "rs2", title: "Hercules", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/hercules.jpeg", description: "" },
      rs3: { id: "rs3", title: "Immortal", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/immortal.jpg", description: "" },
      rs4: { id: "rs4", title: "Silver Elite", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/silver-elite.jpeg", description: "" },
      rs5: { id: "rs5", title: "Wrath", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/wrath.jpg", description: "" },
      rs6: { id: "rs6", title: "The Alchemised", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/alchemised2.jpeg", description: "" },
      rs7: { id: "rs7", title: "Assistant", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/assistant.jpeg", description: "" },
      rs8: { id: "rs8", title: "Bird", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/bird.jpeg", description: "" },
      rs9: { id: "rs9", title: "Knight Moth", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/knight-moth.jpeg", description: "" },
      rs10: { id: "rs10", title: "Wild Reverence", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/wild-reverence.jpeg", description: "" },
      rs11: { id: "rs11", title: "Dire Bound", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/dire-bound.jpg", description: "" },
      rs12: { id: "rs12", title: "The Enemy", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/enemy.jpeg", description: "" },
      rs13: { id: "rs13", title: "Lost Tales", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/lost-tales.jpg", description: "" },
      rs14: { id: "rs14", title: "Rose Chains", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/rose-chains.jpeg", description: "" },
      rs15: { id: "rs15", title: "Witch Guide", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/witch-guide.jpg", description: "" },
      rs16: { id: "rs16", title: "The Mate", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/mate2.jpg", description: "" },
      rs17: { id: "rs17", title: "Onix", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/onix-2.jpeg", description: "" },
      rs18: { id: "rs18", title: "Shield", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/shield.jpg", description: "" },
      rs19: { id: "rs19", title: "Vicious", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/visious.jpg", description: "" },
      rs20: { id: "rs20", title: "Wings of Blood", author: "", coverImageUrl: "/images/collections/curated/romantic-stories/wings-blood.jpeg", description: "" },
    },
    unrankedBookIds: [],
  },
  {
    slug: "best-mystery",
    title: "Лучшие детективы",
    type: "curated",
    excerpt: "Захватывающие детективы и триллеры, которые держат в напряжении до последней страницы.",
    coverImageUrl: "/images/collections/curated/top-detective/intruder.jpg",
    bookCovers: ["/images/books/ubit-peresmeshnika.webp", "/images/books/prestuplenie-i-nakazanie.webp", "/images/books/shadow-wind.webp"],
    tags: ["Детективы", "Триллер", "Мистика", "Криминал"],
    isPublished: true,
    order: 32,
    tiers: { s: { id: "s", title: "Шедевр", color: "#ef4444", bookIds: ["d1", "d2"] }, a: { id: "a", title: "Отлично", color: "#f97316", bookIds: ["d3", "d4"] }, b: { id: "b", title: "Хорошо", color: "#eab308", bookIds: ["d5", "d6"] } },
    tierOrder: ["s", "a", "b"],
    books: {
      d1: { id: "d1", title: "Преступление и наказание", author: "Фёдор Достоевский", coverImageUrl: "/images/books/prestuplenie-i-nakazanie.webp", description: "Психологический детектив о студенте Раскольникове." },
      d2: { id: "d2", title: "Убить пересмешника", author: "Харпер Ли", coverImageUrl: "/images/books/ubit-peresmeshnika.webp", description: "Роман о расовой несправедливости глазами ребёнка." },
      d3: { id: "d3", title: "Тень ветра", author: "Карлос Руис Сафон", coverImageUrl: "/images/books/shadow-wind.webp", description: "Мистический триллер в послевоенной Барселоне." },
      d4: { id: "d4", title: "Имя розы", author: "Умберто Эко", coverImageUrl: "/images/books/imya-rozy.webp", description: "Философский детектив в средневековом монастыре." },
      d5: { id: "d5", title: "Молчание ягнят", author: "Томас Харрис", coverImageUrl: "/images/books/molchanie-yagnyat.webp", description: "Агент ФБР охотится на серийного убийцу." },
      d6: { id: "d6", title: "Десять негритят", author: "Агата Кристи", coverImageUrl: "/images/books/desyat-negrityat.webp", description: "Десять человек на острове — и ни одного живого." },
    },
    unrankedBookIds: [],
  },
  {
    slug: "sci-fi",
    title: "Научная фантастика",
    type: "curated",
    excerpt: "Космос, технологии, будущее — лучшие книги научной фантастики всех времён.",
    coverImageUrl: "/images/collections/curated/top-fantastic/carl.jpeg",
    bookCovers: ["/images/books/dyuna.webp", "/images/books/1984.webp", "/images/books/osnovanie.webp"],
    tags: ["Sci-Fi", "Фантастика", "Космос", "Технологии"],
    isPublished: true,
    order: 33,
    tiers: { s: { id: "s", title: "Шедевр", color: "#ef4444", bookIds: ["f1", "f2"] }, a: { id: "a", title: "Отлично", color: "#f97316", bookIds: ["f3", "f4"] }, b: { id: "b", title: "Хорошо", color: "#eab308", bookIds: ["f5"] }, c: { id: "c", title: "Средне", color: "#84cc16", bookIds: ["f6"] } },
    tierOrder: ["s", "a", "b", "c"],
    books: {
      f1: { id: "f1", title: "Дюна", author: "Фрэнк Герберт", coverImageUrl: "/images/books/dyuna.webp", description: "Эпическая сага о пустынной планете Арракис." },
      f2: { id: "f2", title: "1984", author: "Джордж Оруэлл", coverImageUrl: "/images/books/1984.webp", description: "Антиутопия о тоталитарном обществе под контролем Большого Брата." },
      f3: { id: "f3", title: "Основание", author: "Айзек Азимов", coverImageUrl: "/images/books/osnovanie.webp", description: "Грандиозная сага о падении Галактической Империи." },
      f4: { id: "f4", title: "О дивный новый мир", author: "Олдос Хаксли", coverImageUrl: "/images/books/o-divnyy-novyy-mir.webp", description: "Антиутопия о мире, где людей выращивают в пробирках." },
      f5: { id: "f5", title: "Марсианин", author: "Энди Вейер", coverImageUrl: "/images/books/marsianin.webp", description: "Астронавт выживает на Марсе в одиночку." },
      f6: { id: "f6", title: "Солярис", author: "Станислав Лем", coverImageUrl: "/images/books/solyaris.webp", description: "Психологическая фантастика о разумном океане." },
    },
    unrankedBookIds: [],
  },
  {
    slug: "non-fiction-top",
    title: "Лучший нон-фикшн",
    type: "curated",
    excerpt: "Книги, которые меняют жизнь: от привычек до истории человечества.",
    coverImageUrl: "/images/collections/curated/popular-science/atomic.jpeg",
    bookCovers: ["/images/books/atomnye-privychki.webp", "/images/books/sapiens-kratkaya-istoriya-chelovechestva.webp", "/images/books/dumay-medlenno-reshay-bystro.webp"],
    tags: ["Нон-фикшн", "Саморазвитие", "Наука", "История"],
    isPublished: true,
    order: 34,
    tiers: { s: { id: "s", title: "Обязательно", color: "#ef4444", bookIds: ["n1", "n2"] }, a: { id: "a", title: "Рекомендую", color: "#f97316", bookIds: ["n3", "n4"] }, b: { id: "b", title: "Полезно", color: "#eab308", bookIds: ["n5", "n6"] } },
    tierOrder: ["s", "a", "b"],
    books: {
      n1: { id: "n1", title: "Атомные привычки", author: "Джеймс Клир", coverImageUrl: "/images/books/atomnye-privychki.webp", description: "Практическое руководство по формированию полезных привычек." },
      n2: { id: "n2", title: "Sapiens. Краткая история человечества", author: "Юваль Ной Харари", coverImageUrl: "/images/books/sapiens-kratkaya-istoriya-chelovechestva.webp", description: "От каменного века до наших дней." },
      n3: { id: "n3", title: "Думай медленно... решай быстро", author: "Даниэль Канеман", coverImageUrl: "/images/books/dumay-medlenno-reshay-bystro.webp", description: "Две системы мышления от нобелевского лауреата." },
      n4: { id: "n4", title: "Краткая история времени", author: "Стивен Хокинг", coverImageUrl: "/images/books/kratkaya-istoriya-vremeni.webp", description: "От Большого взрыва до чёрных дыр." },
      n5: { id: "n5", title: "Богатый папа, бедный папа", author: "Роберт Кийосаки", coverImageUrl: "/images/books/bogatyy-papa-bednyy-papa.webp", description: "Финансовая грамотность и мышление богатого человека." },
      n6: { id: "n6", title: "7 навыков высокоэффективных людей", author: "Стивен Кови", coverImageUrl: "/images/books/7-navykov-vysokoeffektivnykh-lyudey.webp", description: "Принципы личной эффективности." },
    },
    unrankedBookIds: [],
  },
];

async function main() {
  const collections = collectionSeeds.map(toPrisma);
  let created = 0;

  for (const data of collections) {
    const exists = await prisma.collection.findUnique({ where: { slug: data.slug } });
    if (!exists) {
      await prisma.collection.create({ data });
      created++;
    }
  }

  if (created > 0) console.log(`Collections created: ${created}`);
  else console.log("Collections: no new ones to create");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
