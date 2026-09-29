import { readFileSync } from 'node:fs';

/** يقرأ الإعدادات من متغيرات البيئة ويرفض التشغيل إن نقص إعداد إلزامي — لا قيم افتراضية للأسرار. */
export function loadConfig(env = process.env) {
  const need = (k) => {
    const v = env[k];
    if (!v || !v.trim()) throw new Error(`الإعداد ${k} مطلوب`);
    return v.trim();
  };
  const key = (k) => {
    const buf = Buffer.from(need(k), 'base64');
    if (buf.length < 32) throw new Error(`${k} يجب أن يكون 32 بايت على الأقل بعد فك base64 (openssl rand -base64 32)`);
    return buf;
  };

  const encryptionKey = key('INTAKE_ENCRYPTION_KEY').subarray(0, 32);
  const sharedSecret = key('INTAKE_SHARED_SECRET');

  const catalogPath = env.INTAKE_CATALOG_PATH || '/app/catalog/services.json';
  let services = [];
  try {
    services = JSON.parse(readFileSync(catalogPath, 'utf8'));
  } catch {
    // بلا فهرس لا يُقبل إلا "غير محدد" — ولا يتوقف الاستقبال.
    console.warn(`[intake] تعذّرت قراءة فهرس الخدمات من ${catalogPath}`);
  }

  return {
    port: Number(env.INTAKE_PORT || 8080),
    outboxDir: env.INTAKE_OUTBOX_DIR || '/data/outbox',
    deadLetterDir: env.INTAKE_DEADLETTER_DIR || '/data/dead-letter',
    encryptionKey,
    sharedSecret,
    internalApiUrl: need('INTERNAL_API_URL'),
    allowedOrigins: (env.ALLOWED_ORIGINS || 'https://www.mgrp.sa,https://mgrp.sa').split(',').map((s) => s.trim()).filter(Boolean),
    trustProxy: env.TRUST_PROXY === '1',
    minFillMs: Number(env.MIN_FILL_MS || 3000),
    maxOutboxAgeHours: Number(env.MAX_OUTBOX_AGE_HOURS || 168),
    forwardIntervalMs: Number(env.FORWARD_INTERVAL_MS || 15000),
    rateLimit: { perHour: Number(env.RATE_PER_HOUR || 5), perDay: Number(env.RATE_PER_DAY || 20) },
    smtp: env.SMTP_HOST
      ? {
          host: env.SMTP_HOST,
          port: Number(env.SMTP_PORT || 587),
          secure: env.SMTP_SECURE === '1',
          auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS || '' } : undefined,
          from: need('SMTP_FROM')
        }
      : null,
    services
  };
}
