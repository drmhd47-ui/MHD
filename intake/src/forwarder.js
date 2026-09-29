import { createHmac } from 'node:crypto';

/** توقيع الرسالة المرسلة إلى النظام الداخلي: HMAC-SHA256 على "الطابع الزمني.المحتوى". */
export function sign(secret, timestamp, body) {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('base64');
}

/**
 * يرسل الطلبات المخزنة إلى نقطة الاستلام الداخلية بالترتيب، ويحذف كل طلب فور تأكيد استلامه.
 * - 2xx أو 409 (سبق استلامه): يُحذف من الصندوق.
 * - 4xx أخرى: خطأ لا تصلحه الإعادة → ينقل إلى صندوق الرسائل المتعذرة.
 * - خطأ شبكة أو 5xx: يبقى ويُعاد لاحقاً، حتى يتجاوز العمر الأقصى فيُحذف (سياسة الخصوصية: 7 أيام).
 */
export class Forwarder {
  constructor({ outbox, url, secret, maxAgeHours, log = console, fetchImpl = fetch }) {
    Object.assign(this, { outbox, url, secret, maxAgeHours, log, fetchImpl });
    this.running = false;
  }

  async deliver(record) {
    const body = JSON.stringify(record);
    const ts = String(Math.floor(Date.now() / 1000));
    const res = await this.fetchImpl(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Intake-Timestamp': ts,
        'X-Intake-Signature': sign(this.secret, ts, body)
      },
      body,
      signal: AbortSignal.timeout(15000)
    });
    return res.status;
  }

  async runOnce() {
    if (this.running) return;
    this.running = true;
    try {
      for (const item of await this.outbox.list()) {
        const ageHours = (Date.now() - item.mtimeMs) / 3_600_000;
        let record;
        try {
          record = await this.outbox.read(item.path);
        } catch {
          this.log.error('[intake] ملف تالف أو مفتاح مختلف — نُقل إلى الرسائل المتعذرة');
          await this.outbox.deadLetter(item.path);
          continue;
        }
        let status = 0;
        try {
          status = await this.deliver(record);
        } catch {
          status = 0;
        }
        if ((status >= 200 && status < 300) || status === 409) {
          await this.outbox.remove(item.path);
          this.log.info(`[intake] سُلّم ${record.reference}`);
        } else if (status >= 400 && status < 500 && status !== 429) {
          await this.outbox.deadLetter(item.path);
          this.log.error(`[intake] رُفض ${record.reference} برمز ${status} — نُقل إلى الرسائل المتعذرة`);
        } else if (ageHours > this.maxAgeHours) {
          await this.outbox.remove(item.path);
          this.log.error(`[intake] حُذف ${record.reference} بعد تجاوز مدة الاحتفاظ دون تسليم`);
        } else {
          this.log.warn(`[intake] تعذّر تسليم ${record.reference} (${status || 'network'}) — سيُعاد لاحقاً`);
          break; // الخادم الداخلي غير متاح: لا فائدة من المحاولة مع البقية الآن
        }
      }
    } finally {
      this.running = false;
    }
  }
}
