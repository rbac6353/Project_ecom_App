/* eslint-disable no-console */
// E2E verification script (API + DB) for:
// - Auto-cancel PENDING_CONFIRMATION orders whose confirmationDeadline has passed
// - refundStatus set to PENDING
// - isAutoCancelled set to true
//
// Usage:
//   node scripts/verify-auto-cancel-refund.js
//
// Prereqs:
// - Backend running on http://localhost:3000
// - MySQL reachable on localhost:3306
// - Test user: user@gmail.com / 12345678
//
// Notes:
// - Tries common DB credentials (root/12345678, root/'') and db names (ecom1, gtxshop_db, gtxshop)

async function httpJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

async function main() {
  const base = 'http://localhost:3000';

  // 0) probe api
  {
    const { res } = await httpJson(`${base}/products?page=1&limit=1`);
    if (!res.ok) throw new Error(`API not ready: GET /products -> ${res.status}`);
  }

  // 1) login
  const login = await httpJson(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@gmail.com', password: '12345678' }),
  });
  if (!login.res.ok) throw new Error(`login failed ${login.res.status}: ${login.text}`);
  const token = login.json?.access_token ?? login.json?.data?.access_token;
  if (!token) throw new Error('login ok but no access_token in response');
  console.log('[OK] login');

  // 2) pick a productId
  const products = await httpJson(`${base}/products?page=1&limit=1`);
  if (!products.res.ok) throw new Error(`GET /products failed ${products.res.status}: ${products.text}`);
  const first = products.json?.data?.data?.[0] ?? products.json?.data?.[0] ?? products.json?.[0];
  const productId = Number(first?.id ?? 1);
  console.log('[OK] productId =', productId);

  // 3) add to cart
  const addCart = await httpJson(`${base}/cart/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ productId, count: 1 }),
  });
  if (!addCart.res.ok) throw new Error(`POST /cart/add failed ${addCart.res.status}: ${addCart.text}`);
  console.log('[OK] cart add');

  // 4) create order (STRIPE should lead to PENDING_CONFIRMATION)
  const createOrder = await httpJson(`${base}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      shippingAddress: 'QA Test Address',
      shippingPhone: '0999999999',
      paymentMethod: 'STRIPE',
    }),
  });
  if (!createOrder.res.ok) throw new Error(`POST /orders failed ${createOrder.res.status}: ${createOrder.text}`);
  const orderId = Number(createOrder.json?.id ?? createOrder.json?.data?.id);
  if (!orderId) throw new Error(`order created but no id: ${createOrder.text}`);
  console.log('[OK] order created id =', orderId);

  // 5) update DB confirmationDeadline to past
  const mysql = require('mysql2/promise');
  const candidates = [
    { host: 'localhost', user: 'root', password: '12345678', database: 'ecom1' },
    { host: '127.0.0.1', user: 'root', password: '12345678', database: 'ecom1' },
    { host: 'localhost', user: 'root', password: '', database: 'ecom1' },
    { host: 'localhost', user: 'root', password: '12345678', database: 'gtxshop_db' },
    { host: 'localhost', user: 'root', password: '', database: 'gtxshop_db' },
    { host: 'localhost', user: 'root', password: '', database: 'gtxshop' },
  ];

  let conn = null;
  let connInfo = null;
  for (const c of candidates) {
    try {
      conn = await mysql.createConnection({ ...c, port: 3306 });
      connInfo = c;
      break;
    } catch {
      // keep trying
    }
  }
  if (!conn) throw new Error('DB connect failed (tried common credentials). Please provide DB creds.');
  console.log('[OK] db connected', connInfo.database, `(${connInfo.user}@${connInfo.host})`);

  await conn.execute(
    "UPDATE `order` SET orderStatus='PENDING_CONFIRMATION', isAutoCancelled=0, confirmationDeadline=DATE_SUB(NOW(), INTERVAL 1 DAY), paymentSlipUrl=COALESCE(paymentSlipUrl, CONCAT('qa-slip-', id)) WHERE id=?",
    [orderId],
  );
  await conn.end();
  console.log('[OK] db updated confirmationDeadline to past');

  // 6) wait for cron
  console.log('[WAIT] 70s for cron...');
  await new Promise((r) => setTimeout(r, 70_000));

  // 7) verify via API
  const getOrder = await httpJson(`${base}/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!getOrder.res.ok) throw new Error(`GET /orders/${orderId} failed ${getOrder.res.status}: ${getOrder.text}`);

  const o = getOrder.json?.data ?? getOrder.json;
  console.log('[RESULT]', {
    orderStatus: o.orderStatus,
    refundStatus: o.refundStatus,
    isAutoCancelled: o.isAutoCancelled,
  });

  const ok =
    o.orderStatus === 'CANCELLED' && o.refundStatus === 'PENDING' && (o.isAutoCancelled === true || o.isAutoCancelled === 1);
  if (!ok) throw new Error('Verification failed: expected CANCELLED + PENDING + isAutoCancelled=true');

  console.log('[PASS] Auto-cancel + refundStatus verified');
}

main().catch((e) => {
  console.error('[FAIL]', e.message);
  process.exit(1);
});

