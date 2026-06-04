import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE_URL = __ENV.API_URL || 'http://localhost:8080';
const USER_COUNT = 100;

const aiRequests = new Counter('ai_requests');
const aiErrors = new Counter('ai_errors');
const aiProviderExhausted = new Counter('ai_provider_exhausted');
const aiDuration = new Trend('ai_duration');

export const options = {
  scenarios: {
    aiLibrarian: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 5 },
        { duration: '20s', target: 20 },
        { duration: '20s', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '20s', target: 100 },
        { duration: '10s', target: 0 },
      ],
      gracefulStop: '60s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<30000'],
    http_req_failed: ['rate<0.40'],
  },
};

const MESSAGES = [
  [{ role: 'user', content: 'Какие книги посоветуешь по русской классике?' }],
  [{ role: 'user', content: 'Что почитать из современной прозы?' }],
  [{ role: 'user', content: 'Посоветуй книги в жанре фантастики' }],
  [{ role: 'user', content: 'Какие детективы стоит прочитать?' }],
  [{ role: 'user', content: 'Назови топ-5 книг по саморазвитию' }],
];

export default function () {
  sleep(Math.random() * 5);

  const n = (__VU % USER_COUNT) + 1;
  const creds = { username: `load_${n}`, password: 'TestPass123!' };

  // ——— Login ———
  const login = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(creds),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } });
  check(login, { 'login 200': (r) => r.status === 200 });
  if (login.status !== 200) return;

  let token;
  try { token = JSON.parse(login.body).data.accessToken; } catch { return; }

  const auth = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  sleep(0.3);

  // ——— Chat with AI Librarian ———
  const messages = MESSAGES[__VU % MESSAGES.length];
  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/ai/librarian/chat`,
    JSON.stringify({ messages }),
    { ...auth, tags: { name: 'aiChat' }, timeout: '120s' },
  );
  const elapsed = (Date.now() - start) / 1000;
  aiDuration.add(elapsed);

  if (res.status === 502) {
    // Proper error: all providers exhausted
    aiProviderExhausted.add(1);
    aiErrors.add(1);
    check(res, { 'provider exhausted 502': (r) => r.status === 502 });
    return;
  }

  if (res.status !== 200) {
    aiErrors.add(1);
    check(res, { 'unexpected status': (r) => r.status === 200 });
    return;
  }

  // Parse SSE body — detect error events
  const hasErrorEvent = res.body && res.body.includes('"type":"error"');
  if (hasErrorEvent) {
    aiErrors.add(1);
    fail('SSE contained error event');
  } else {
    aiRequests.add(1);
    check(res, { 'ai success': (r) => r.status === 200 });
  }
}

export function setup() {
  const login = http.post(`${BASE_URL}/api/auth/login`,
    JSON.stringify({ username: 'load_1', password: 'TestPass123!' }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'setup_login' } });

  if (login.status !== 200) {
    console.log('Setup login failed:', login.status, login.body);
    return;
  }

  const token = JSON.parse(login.body).data.accessToken;
  const status = http.get(`${BASE_URL}/api/ai/librarian/status`,
    { headers: { Authorization: `Bearer ${token}` }, tags: { name: 'setup_status' } });
  console.log(`AI Status: ${status.status} ${status.body.substring(0, 120)}`);
}
