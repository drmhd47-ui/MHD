import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createApp, RateLimiter } from '../src/server.js';
import { Outbox } from '../src/outbox.js';
import { Forwarder, sign } from '../src/forwarder.js';
import { autoReply } from '../src/mailer.js';
import { looksAutomated, normalizeSaudiMobile, validateSubmission } from '../src/validate.js';

const services = [{ slug: 'litigation', titleAr: 'التقاضي أمام المحاكم' }];
const valid = { lang: 'ar', name: 'شركة الاختبار', contactMethod: 'phone', phone: '0551234567', consent: 'yes', service: 'litigation', policyVersion: '2026-09-29' };

test('normalizes Saudi mobile numbers in all common formats', () => {
  for (const v of ['0551234567', '+966551234567', '966551234567', '00966551234567', '055 123 4567', '٠٥٥١٢٣٤٥٦٧']) assert.equal(normalizeSaudiMobile(v), '0551234567', v);
  for (const v of ['0151234567', '05512345', '12345', '']) assert.equal(normalizeSaudiMobile(v), null, v);
});

test('validates required fields and contact method', () => {
  assert.deepEqual(validateSubmission({ ...valid, name: 'x' }, { services }).errors, { name: 'invalid' });
  assert.deepEqual(validateSubmission({ ...valid, phone: '123' }, { services }).errors, { phone: 'invalid' });
  assert.deepEqual(validateSubmission({ ...valid, contactMethod: 'email', phone: '' }, { services }).errors, { email: 'invalid' });
  assert.deepEqual(validateSubmission({ ...valid, consent: undefined }, { services }).errors, { consent: 'required' });
  const { record } = validateSubmission(valid, { services });
  assert.equal(record.serviceTitle, 'التقاضي أمام المحاكم');
  assert.match(record.reference, /^MG-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
});

test('unknown service is stored as unspecified and control characters are stripped', () => {
  const { record } = validateSubmission({ ...valid, service: 'x-y', name: 'اسم‮\u0000 مخادع' }, { services });
  assert.equal(record.serviceSlug, null);
  assert.equal(record.fullName, 'اسم مخادع');
});

test('detects honeypot and too-fast submissions', () => {
  assert.equal(looksAutomated({ website: 'spam' }, 3000), true);
  assert.equal(looksAutomated({ renderedAt: String(Date.now() - 500) }, 3000), true);
  assert.equal(looksAutomated({ renderedAt: String(Date.now() - 10000) }, 3000), false);
  assert.equal(looksAutomated({}, 3000), false);
});

test('rate limiter enforces the hourly limit per IP', () => {
  const rl = new RateLimiter({ perHour: 2, perDay: 10 });
  assert.equal(rl.allow('1.1.1.1'), true);
  assert.equal(rl.allow('1.1.1.1'), true);
  assert.equal(rl.allow('1.1.1.1'), false);
  assert.equal(rl.allow('2.2.2.2'), true);
});

test('auto reply contains no legal content and no submitted details beyond name and reference', () => {
  const { record } = validateSubmission({ ...valid, opposingParty: 'الطرف السري' }, { services });
  const m = autoReply(record);
  assert.ok(m.text.includes(record.reference));
  assert.ok(!m.text.includes('الطرف السري'));
  assert.ok(!m.text.includes('0551234567'));
  assert.ok(m.text.includes('لا تتضمن أي رأي أو استشارة قانونية'));
});

test('end to end: accepts, stores encrypted, forwards signed and deletes after delivery', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'intake-'));
  const key = randomBytes(32);
  const secret = randomBytes(32);
  const outbox = new Outbox(join(dir, 'out'), join(dir, 'dead'), key);
  await outbox.init();

  // نقطة استلام داخلية وهمية تتحقق من التوقيع
  const received = [];
  const internal = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const ok = req.headers['x-intake-signature'] === sign(secret, req.headers['x-intake-timestamp'], body);
      if (ok) received.push(JSON.parse(body));
      res.writeHead(ok ? 201 : 401).end();
    });
  });
  await new Promise((r) => internal.listen(0, r));
  const url = `http://127.0.0.1:${internal.address().port}/api/internal/intake-requests`;

  const forwarder = new Forwarder({ outbox, url, secret, maxAgeHours: 168, log: { info() {}, warn() {}, error() {} } });
  const sent = [];
  const app = createApp(
    { allowedOrigins: ['https://www.mgrp.sa'], trustProxy: false, minFillMs: 3000, services },
    { outbox, forwarder: { runOnce: async () => {} }, mailer: { send: async (r) => sent.push(r) }, limiter: new RateLimiter({ perHour: 5, perDay: 20 }), log: { info() {}, error() {} } }
  );
  const server = createServer((q, s) => app(q, s));
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const post = (fields, headers = {}) =>
    fetch(`${base}/api/intake`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://www.mgrp.sa', ...headers },
      body: new URLSearchParams(fields)
    });

  // رفض نطاق غريب
  assert.equal((await post(valid, { Origin: 'https://evil.example' })).status, 403);

  // بدون JavaScript: تحويل إلى صفحة الشكر
  const r1 = await post({ ...valid, email: 'client@example.com' });
  assert.equal(r1.status, 303);
  assert.match(r1.headers.get('location'), /^\/ar\/contact\/thanks\/\?ref=MG-/);

  // مع JavaScript: JSON، وأخطاء التحقق 422
  const r2 = await post({ ...valid, phone: '1' }, { Accept: 'application/json' });
  assert.equal(r2.status, 422);
  assert.deepEqual((await r2.json()).errors, { phone: 'invalid' });

  // الملف المخزن مشفّر: لا يظهر فيه الاسم نصاً
  const files = await readdir(join(dir, 'out'));
  assert.equal(files.length, 1);
  const raw = await readFile(join(dir, 'out', files[0]));
  assert.ok(!raw.toString('utf8').includes('شركة الاختبار'));

  // الإشعار الآلي أُطلق بعد الحفظ
  assert.equal(sent.length, 1);

  await forwarder.runOnce();
  assert.equal(received.length, 1);
  assert.equal(received[0].fullName, 'شركة الاختبار');
  assert.equal(received[0].phone, '0551234567');
  assert.equal((await readdir(join(dir, 'out'))).length, 0, 'deleted after delivery');

  server.close();
  internal.close();
});

test('forwarder keeps the request when the internal system is down, and dead-letters rejected ones', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'intake-'));
  const outbox = new Outbox(join(dir, 'out'), join(dir, 'dead'), randomBytes(32));
  await outbox.init();
  const { record } = validateSubmission(valid, { services });
  await outbox.put(record);
  const quiet = { info() {}, warn() {}, error() {} };

  await new Forwarder({ outbox, url: 'http://127.0.0.1:1/x', secret: randomBytes(32), maxAgeHours: 168, log: quiet }).runOnce();
  assert.equal((await outbox.list()).length, 1, 'kept for retry');

  await new Forwarder({ outbox, url: 'http://x', secret: randomBytes(32), maxAgeHours: 168, log: quiet, fetchImpl: async () => ({ status: 400 }) }).runOnce();
  assert.equal((await outbox.list()).length, 0);
  assert.equal((await readdir(join(dir, 'dead'))).length, 1, 'moved to dead-letter');
});
