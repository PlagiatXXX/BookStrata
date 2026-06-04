import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = 'http://localhost:8080';

const tierListsCreated = new Counter('tier_lists_created');

export const options = {
  scenarios: {
    create: {
      executor: 'shared-iterations',
      vus: 100,
      iterations: 100,
    },
  },
};

export default function () {
  const n = (__VU % 100) + 1;
  const creds = { username: `load_${n}`, password: 'TestPass123!' };

  const login = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(creds),
    { headers: { 'Content-Type': 'application/json' } });
  if (login.status !== 200) return;

  const token = JSON.parse(login.body).data.accessToken;
  if (!token) return;

  const auth = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };

  const res = http.post(`${BASE_URL}/api/tier-lists`,
    JSON.stringify({ title: `load-${__VU}-${Date.now()}` }), auth);
  if (res.status === 201) tierListsCreated.add(1);
}

export function setup() {
  let ok = 0;
  for (let i = 1; i <= 100; i++) {
    const r = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
      username: `load_${i}`, email: `load_${i}@test.local`,
      password: 'TestPass123!', agreeToTerms: true,
    }), { headers: { 'Content-Type': 'application/json' } });
    if (r.status === 201 || r.status === 409) ok++;
  }
  console.log(`Users: ${ok}/100`);
}

export function teardown() {
  const adminUser = __ENV.ADMIN_USER || 'fedor';
  const adminPass = __ENV.ADMIN_PASSWORD || 'TestPass123!';

  const login = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    username: adminUser, password: adminPass,
  }), { headers: { 'Content-Type': 'application/json' } });

  if (login.status !== 200) {
    console.log(`Teardown: admin login failed (${login.status}). Run "npm run cleanup:load-test" manually.`);
    return;
  }

  const token = JSON.parse(login.body).data.accessToken;
  const res = http.post(`${BASE_URL}/api/admin/cleanup-load-test`, '', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 200) {
    const data = JSON.parse(res.body).data;
    console.log(`Teardown: deleted ${data.deleted} load test users, ${data.orphanedBooks} orphaned books`);
  } else {
    console.log(`Teardown: cleanup failed (${res.status}). Run "npm run cleanup:load-test" manually.`);
  }
}
