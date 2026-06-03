import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:8080';
const USER_COUNT = 100;

export const options = {
  stages: [
    { duration: '20s', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 100 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

function checkResp(res, expected = 200) {
  return check(res, {
    [`status ${expected}`]: (r) => r.status === expected,
    'duration < 2s': (r) => r.duration < 2000,
  });
}

function pickCreds(vu) {
  const n = (vu % USER_COUNT) + 1;
  return {
    username: `load_${n}`,
    password: 'TestPass123!',
  };
}

export default function () {
  const creds = pickCreds(__VU);

  // ——— анонимный Browse ———
  let r = http.get(`${BASE_URL}/api/tier-lists/public?page=1&pageSize=10&sortBy=updated_at`,
    { tags: { name: 'browsePublic' } });
  checkResp(r);
  sleep(0.5 + Math.random());

  // ——— Login ———
  const loginRes = http.post(`${BASE_URL}/api/auth/login`,
    JSON.stringify(creds),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } },
  );
  const ok = checkResp(loginRes);
  if (!ok) {
    // если не залогинились — всё равно делаем паузу и выходим
    sleep(3 + Math.random() * 2);
    return;
  }

  let token;
  try { token = loginRes.json('data.accessToken'); } catch { /* skip */ }
  if (!token) {
    sleep(3 + Math.random() * 2);
    return;
  }

  const auth = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  sleep(0.3 + Math.random());

  // ——— Профиль ———
  r = http.get(`${BASE_URL}/api/users/me`, auth);
  checkResp(r);
  sleep(0.3 + Math.random());

  // ——— Мои тир-листы ———
  r = http.get(`${BASE_URL}/api/tier-lists?page=1&pageSize=5`, auth);
  checkResp(r);
  sleep(0.5 + Math.random());

  // ——— Поиск книг ———
  r = http.get(`${BASE_URL}/api/books/search?q=${encodeURIComponent('война и мир')}&startIndex=0`, auth);
  checkResp(r);
  sleep(0.5 + Math.random());

  // ——— Публичные тир-листы (авторизованно) ———
  r = http.get(`${BASE_URL}/api/tier-lists/public?page=1&pageSize=5&sortBy=likes`, auth);
  checkResp(r);
  sleep(0.5 + Math.random());

  // ——— Новости ———
  r = http.get(`${BASE_URL}/api/news?page=1&pageSize=5`, auth);
  checkResp(r);

  sleep(1 + Math.random() * 2);
}

export function setup() {
  console.log(`\n=== Load test: ${BASE_URL}, ${USER_COUNT} users ===`);

  let created = 0;
  for (let i = 1; i <= USER_COUNT; i++) {
    const payload = JSON.stringify({
      username: `load_${i}`,
      email: `load_${i}@loadtest.bookstrata.local`,
      password: 'TestPass123!',
      agreeToTerms: true,
    });
    const r = http.post(`${BASE_URL}/api/auth/register`, payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'setup' },
    });
    if (r.status === 201) created++;
  }
  console.log(`  Registered ${created}/${USER_COUNT} users`);
  console.log('=== Starting test ===\n');
}
