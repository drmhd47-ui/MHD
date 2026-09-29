import nodemailer from 'nodemailer';

/**
 * رسالة الإشعار الآلية للعميل: تأكيد استلام فقط، بلا أي محتوى قانوني أو رأي أو تقدير للمسألة،
 * وبلا تكرار لما كتبه العميل (عدا الاسم ورقم الطلب).
 */
export function autoReply(record) {
  if (record.language === 'en') {
    return {
      subject: `Request received — ${record.reference}`,
      text: [
        `Dear ${record.fullName},`,
        '',
        `We have received your consultation request number ${record.reference}.`,
        'A member of the M GROUP team will contact you during working hours (Sunday to Thursday, 8:00 AM to 6:00 PM).',
        '',
        'This is an automatic message. It contains no legal opinion or advice, and receipt of your request does not create a lawyer-client relationship.',
        'Please do not reply to this message with documents or confidential details.',
        '',
        'M GROUP — Licensed professional law firm',
        'King Abdullah Financial District (KAFD), Riyadh 13519',
        '+966 546 444 000 · info@mgrp.sa · www.mgrp.sa'
      ].join('\n')
    };
  }
  return {
    subject: `تم استلام طلبك — ${record.reference}`,
    text: [
      `الأستاذ/ة ${record.fullName}،`,
      '',
      `تم استلام طلب الاستشارة رقم ${record.reference}.`,
      'سيتواصل معك أحد أعضاء فريق مجموعة إم القانونية خلال أوقات العمل (الأحد إلى الخميس، من 8 صباحاً إلى 6 مساءً).',
      '',
      'هذه رسالة آلية لا تتضمن أي رأي أو استشارة قانونية، ولا يُنشئ استلام الطلب علاقة توكيل.',
      'نرجو عدم الرد على هذه الرسالة بمستندات أو تفاصيل سرية.',
      '',
      'مجموعة إم القانونية — شركة محاماة مهنية مرخّصة',
      'مركز الملك عبدالله المالي (كافد)، الرياض 13519',
      '0546444000 · info@mgrp.sa · www.mgrp.sa'
    ].join('\n')
  };
}

export function createMailer(smtp, log = console) {
  if (!smtp) {
    log.warn('[intake] SMTP غير مُعد — لن تُرسل رسائل الإشعار الآلية');
    return { send: async () => false };
  }
  const transport = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: smtp.auth });
  return {
    async send(record) {
      if (!record.email) return false;
      const m = autoReply(record);
      try {
        await transport.sendMail({ from: smtp.from, to: record.email, subject: m.subject, text: m.text });
        return true;
      } catch {
        log.error(`[intake] تعذّر إرسال الإشعار الآلي لـ ${record.reference}`);
        return false;
      }
    }
  };
}
