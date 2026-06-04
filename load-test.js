import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.API_URL || 'http://localhost:8080';
const USER_COUNT = 100;

const tierListsCreated = new Counter('tier_lists_created');

const TIER_TEMPLATES = [
  { title: 'S', color: '#ff4444', rank: 0 },
  { title: 'A', color: '#ff8800', rank: 1 },
  { title: 'B', color: '#ffcc00', rank: 2 },
  { title: 'C', color: '#88cc44', rank: 3 },
  { title: 'D', color: '#4488ff', rank: 4 },
];

const BOOK_TEMPLATES = [
  { title: 'Война и мир', author: 'Лев Толстой' },
  { title: 'Преступление и наказание', author: 'Фёдор Достоевский' },
  { title: 'Мастер и Маргарита', author: 'Михаил Булгаков' },
  { title: '1984', author: 'Джордж Оруэлл' },
  { title: 'Маленький принц', author: 'Антуан де Сент-Экзюпери' },
  { title: 'Гарри Поттер и философский камень', author: 'Дж. К. Роулинг' },
  { title: 'Властелин колец', author: 'Дж. Р. Р. Толкин' },
  { title: 'Гордость и предубеждение', author: 'Джейн Остин' },
  { title: 'Три товарища', author: 'Эрих Мария Ремарк' },
  { title: 'Над пропастью во ржи', author: 'Дж. Д. Сэлинджер' },
  { title: 'Сто лет одиночества', author: 'Габриэль Гарсиа Маркес' },
];

export const options = {
  scenarios: {
    createTierLists: {
      executor: 'shared-iterations',
      vus: 100,
      iterations: 100,
      maxDuration: '5m',
      gracefulStop: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<15000'],
    http_req_failed: ['rate<0.35'],
  },
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function () {
  sleep(Math.random() * 3);

  const n = (__VU % USER_COUNT) + 1;
  const creds = { username: `load_${n}`, password: 'TestPass123!' };

  // ——— Login ———
  const login = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(creds),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } });
  if (login.status !== 200) return;

  let token;
  try { token = JSON.parse(login.body).data.accessToken; } catch { return; }

  const auth = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  sleep(0.3);

  // ——— Create tier list ———
  const createRes = http.post(`${BASE_URL}/api/tier-lists`,
    JSON.stringify({ title: `load-${__VU}-${Date.now()}` }),
    { ...auth, tags: { name: 'createTierList' } });
  if (createRes.status !== 201) return;

  const tierListId = createRes.json('data.id');
  if (!tierListId) return;
  tierListsCreated.add(1);
  sleep(0.3);

  // ——— Add tiers ———
  http.put(`${BASE_URL}/api/tier-lists/${tierListId}/tiers`,
    JSON.stringify({ added: TIER_TEMPLATES }),
    { ...auth, tags: { name: 'updateTiers' } });
  sleep(0.2);

  // ——— Get tier list (need tier ids) ———
  const getRes = http.get(`${BASE_URL}/api/tier-lists/${tierListId}`,
    { ...auth, tags: { name: 'getTierList' } });
  if (getRes.status !== 200) return;

  const tiers = getRes.json('data.tiers');
  if (!tiers || tiers.length === 0) return;
  sleep(0.2);

  // ——— Add books ———
  const bookCount = Math.floor(Math.random() * 4) + 3;
  const books = shuffle(BOOK_TEMPLATES).slice(0, bookCount).map((b) => ({
    title: b.title, author: b.author, coverImageUrl: '',
    description: `Описание книги «${b.title}»`,
  }));
  const booksRes = http.post(`${BASE_URL}/api/tier-lists/${tierListId}/books`,
    JSON.stringify({ books }),
    { ...auth, tags: { name: 'addBooks' } });
  if (booksRes.status !== 201) return;

  const results = booksRes.json('data.results');
  if (!results || results.length === 0) return;
  sleep(0.2);

  // ——— Placements ———
  http.put(`${BASE_URL}/api/tier-lists/${tierListId}/placements`,
    JSON.stringify({
      placements: results.map((p, i) => ({
        bookId: p.bookId,
        tierId: tiers[i % tiers.length].id,
        rank: Math.floor(i / tiers.length),
      })),
    }),
    { ...auth, tags: { name: 'placements' } });
}

export function setup() {
  let ok = 0;
  for (let i = 1; i <= USER_COUNT; i++) {
    const r = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
      username: `load_${i}`, email: `load_${i}@loadtest.bookstrata.local`,
      password: 'TestPass123!', agreeToTerms: true,
    }), { headers: { 'Content-Type': 'application/json' }, tags: { name: 'setup' } });
    if (r.status === 201 || r.status === 409) ok++;
  }
  console.log(`\nLoad test: ${BASE_URL} | Users: ${ok}/${USER_COUNT}\n`);
}

export function teardown() {
  const adminUser = __ENV.ADMIN_USER || 'fedor';
  const adminPass = __ENV.ADMIN_PASSWORD || 'TestPass123!';

  const login = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    username: adminUser, password: adminPass,
  }), { headers: { 'Content-Type': 'application/json' }, tags: { name: 'teardown_login' } });

  if (login.status !== 200) {
    console.log(`Teardown: admin login failed (${login.status}). Run "npm run cleanup:load-test" manually.`);
    return;
  }

  const token = JSON.parse(login.body).data.accessToken;
  const res = http.post(`${BASE_URL}/api/admin/cleanup-load-test`, '', {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name: 'teardown_cleanup' },
  });

  if (res.status === 200) {
    const data = JSON.parse(res.body).data;
    console.log(`\nTeardown: deleted ${data.deleted} load test users, ${data.orphanedBooks} orphaned books`);
  } else {
    console.log(`Teardown: cleanup failed (${res.status}). Run "npm run cleanup:load-test" manually.`);
  }
}
