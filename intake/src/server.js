import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { loadConfig } from './config.js';
import { Outbox } from './outbox.js';
import { Forwarder } from './forwarder.js';
import { createMailer } from './mailer.js';
import { looksAutomated, newReference, validateSubmission } from './validate.js';

const MAX_BODY = 8 * 1024;

/** محدِّد معدل في الذاكرة لكل عنوان IP (ساعة ويوم). لا يُخزَّن العنوان مع الطلب ولا على القرص. */
export class RateLimiter {
  constructor({ perHour, perDay }) {
    this.perHour = perHour;
    this.perDay = perDay;
    this.hits = new Map();
  }
  allow(ip, now = Date.now()) {
    const day = 86_400_000;
    const list = (this.hits.get(ip) ?? []).filter((t) => now - t < day);
    const lastHour = list.filter((t) => now - t < 3_600_000).length;
    if (lastHour >= this.perHour || list.length >= this.perDay) {
      this.hits.set(ip, list);
      return false;
    }
    list.push(now);
    this.hits.set(ip, list);
    return true;
  }
  sweep(now = Date.now()) {
    for (const [ip, list] of this.hits) if (!list.some((t) => now - t < 86_400_000)) this.hits.delete(ip);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('too large'), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function createApp(cfg, { outbox, forwarder, mailer, limiter, log = console }) {
  const wantsJson = (req) => (req.headers.accept ?? '').includes('application/json');
  const clientIp = (req) =>
    (cfg.trustProxy && (req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim())) ||
    req.socket.remoteAddress ||
    'unknown';

  const send = (res, status, body, headers = {}) => {
    res.writeHead(status, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
    res.end(body);
  };
  const json = (res, status, obj) => send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8' });
  const redirect = (res, location) => send(res, 303, '', { Location: location });

  return async (req, res) => {
    const url = new URL(req.url, 'http://intake.local');

    if (req.method === 'GET' && url.pathname === '/healthz') return json(res, 200, { status: 'ok' });
    if (url.pathname !== '/api/intake') return json(res, 404, { error: 'not_found' });
    if (req.method !== 'POST') return send(res, 405, '', { Allow: 'POST' });

    // النموذج يُرسل من نطاق الموقع فقط.
    const origin = req.headers.origin;
    if (origin && !cfg.allowedOrigins.includes(origin)) return json(res, 403, { error: 'origin' });

    const ctype = String(req.headers['content-type'] ?? '');
    if (!ctype.startsWith('application/x-www-form-urlencoded')) return json(res, 415, { error: 'content_type' });

    let fields;
    try {
      fields = Object.fromEntries(new URLSearchParams(await readBody(req)));
    } catch (e) {
      return json(res, e.status ?? 400, { error: 'body' });
    }
    const lang = fields.lang === 'en' ? 'en' : 'ar';

    if (!limiter.allow(clientIp(req))) {
      return wantsJson(req) ? json(res, 429, { error: 'rate' }) : redirect(res, `/${lang}/contact/error/`);
    }

    // الإرسال الآلي يُقابَل بنجاح شكلي دون حفظ شيء، حتى لا يتعلم المرسِل كيف يتجاوز الفحص.
    if (looksAutomated(fields, cfg.minFillMs)) {
      const reference = newReference();
      return wantsJson(req) ? json(res, 200, { reference }) : redirect(res, `/${lang}/contact/thanks/?ref=${reference}`);
    }

    const result = validateSubmission(fields, { services: cfg.services });
    if (result.errors) {
      return wantsJson(req) ? json(res, 422, { errors: result.errors }) : redirect(res, `/${lang}/contact/error/`);
    }

    const { record } = result;
    try {
      await outbox.put(record);
    } catch {
      log.error('[intake] تعذّر حفظ الطلب في الصندوق الصادر');
      return wantsJson(req) ? json(res, 503, { error: 'unavailable' }) : redirect(res, `/${lang}/contact/error/`);
    }
    log.info(`[intake] استُلم ${record.reference}`);

    // بعد الحفظ الدائم فقط: إشعار العميل ومحاولة تسليم فورية (لا ينتظرهما الرد).
    mailer.send(record).catch(() => {});
    forwarder.runOnce().catch(() => {});

    return wantsJson(req)
      ? json(res, 200, { reference: record.reference })
      : redirect(res, `/${lang}/contact/thanks/?ref=${record.reference}`);
  };
}

export async function main() {
  const cfg = loadConfig();
  const outbox = new Outbox(cfg.outboxDir, cfg.deadLetterDir, cfg.encryptionKey);
  await outbox.init();
  const forwarder = new Forwarder({ outbox, url: cfg.internalApiUrl, secret: cfg.sharedSecret, maxAgeHours: cfg.maxOutboxAgeHours });
  const mailer = createMailer(cfg.smtp);
  const limiter = new RateLimiter(cfg.rateLimit);

  const app = createApp(cfg, { outbox, forwarder, mailer, limiter });
  const server = createServer((req, res) =>
    app(req, res).catch(() => {
      if (!res.headersSent) res.writeHead(500).end();
    })
  );
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;

  setInterval(() => forwarder.runOnce().catch(() => {}), cfg.forwardIntervalMs).unref();
  setInterval(() => limiter.sweep(), 3_600_000).unref();
  forwarder.runOnce().catch(() => {});

  server.listen(cfg.port, () => console.log(`[intake] يعمل على المنفذ ${cfg.port}`));
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
