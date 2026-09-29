import { randomBytes, randomUUID } from 'node:crypto';

const BASE32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** رقم مرجعي قصير يُعرض للعميل، بلا دلالة على ترتيب أو عدد الطلبات: MG-XXXX-XXXX */
export function newReference() {
  const b = randomBytes(8);
  const chars = [...b].map((x) => BASE32[x % BASE32.length]).join('');
  return `MG-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

const clean = (v, max) =>
  String(v ?? '')
    .replace(/[\u0000-\u001f\u007f‪-‮⁦-⁩]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

/** يوحّد رقم الجوال السعودي إلى 05XXXXXXXX أو يعيد null. */
export function normalizeSaudiMobile(raw) {
  const digits = String(raw ?? '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\s\-()]/g, '');
  const m = digits.match(/^(?:\+?966|00966|0)?(5\d{8})$/);
  return m ? `0${m[1]}` : null;
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

/**
 * يتحقق من حقول النموذج (نفس قواعد الواجهة، والخادم هو المرجع).
 * يعيد { errors } أو { record } جاهزاً للحفظ.
 */
export function validateSubmission(fields, { services = [], now = Date.now() } = {}) {
  const errors = {};
  const lang = fields.lang === 'en' ? 'en' : 'ar';
  const name = clean(fields.name, 120);
  const contactMethod = fields.contactMethod === 'email' ? 'email' : 'phone';
  const phoneRaw = clean(fields.phone, 20);
  const emailRaw = clean(fields.email, 160).toLowerCase();
  const phone = phoneRaw ? normalizeSaudiMobile(phoneRaw) : null;
  const email = emailRaw && EMAIL.test(emailRaw) ? emailRaw : null;

  if (name.length < 2) errors.name = 'invalid';
  if ((contactMethod === 'phone' || phoneRaw) && !phone) errors.phone = 'invalid';
  if ((contactMethod === 'email' || emailRaw) && !email) errors.email = 'invalid';
  if (fields.consent !== 'yes') errors.consent = 'required';

  const slug = clean(fields.service, 80);
  const service = slug ? services.find((s) => s.slug === slug) : null;
  // خدمة غير معروفة لا تُسقط الطلب؛ تُعامل كـ "غير محدد".

  const policyVersion = /^\d{4}-\d{2}-\d{2}$/.test(fields.policyVersion ?? '') ? fields.policyVersion : 'unknown';

  if (Object.keys(errors).length) return { errors, lang };

  return {
    lang,
    record: {
      id: randomUUID(),
      reference: newReference(),
      submittedAt: new Date(now).toISOString(),
      language: lang,
      fullName: name,
      preferredContact: contactMethod,
      phone,
      email,
      serviceSlug: service?.slug ?? null,
      serviceTitle: service?.titleAr ?? null,
      opposingPartyName: clean(fields.opposingParty, 160) || null,
      consentAt: new Date(now).toISOString(),
      privacyPolicyVersion: policyVersion
    }
  };
}

/** فحوص مكافحة الإغراق الصامتة: حقل الفخ، أو إرسال أسرع من أن يكون بشرياً. */
export function looksAutomated(fields, minFillMs, now = Date.now()) {
  if (String(fields.website ?? '').trim() !== '') return true;
  const rendered = Number(fields.renderedAt);
  if (Number.isFinite(rendered) && rendered > 0 && now - rendered < minFillMs) return true;
  return false;
}
