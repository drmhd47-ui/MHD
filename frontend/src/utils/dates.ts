/**
 * تنسيق التواريخ بتوقيت الرياض. المهل والجلسات تُعرض بالتقويم الميلادي مع المقابل الهجري، لأن الإعداد
 * الافتراضي للغة ar-SA هجري وحده، والتاريخ الملتبس في مهلة نظامية خطر على الحق.
 */
const TZ = 'Asia/Riyadh'

const greg = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { timeZone: TZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { timeZone: TZ, year: 'numeric', month: 'long', day: 'numeric' })
const time = new Intl.DateTimeFormat('ar-SA-u-nu-latn', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })

/** "yyyy-mm-dd" (DateOnly من الخادم) → تاريخ عند منتصف نهار الرياض لتفادي انزلاق اليوم. */
function fromDateOnly(d: string): Date {
  return new Date(`${d}T12:00:00+03:00`)
}

export function formatDateOnly(d: string): string {
  const x = fromDateOnly(d)
  return `${greg.format(x)} (${hijri.format(x)})`
}

export function formatDateTime(iso: string): string {
  const x = new Date(iso)
  return `${greg.format(x)} — ${time.format(x)} (${hijri.format(x)})`
}

/** قيمة حقل datetime-local بتوقيت الرياض. */
export function toRiyadhInput(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(iso))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/** حقل datetime-local مدخل بتوقيت الرياض → ISO (المملكة بلا توقيت صيفي: +03:00 ثابت). */
export function fromRiyadhInput(v: string): string {
  return new Date(`${v}:00+03:00`).toISOString()
}

export function todayRiyadh(): string {
  return toRiyadhInput(new Date().toISOString()).slice(0, 10)
}

export function daysLeftLabel(n: number): string {
  if (n < 0) return `متأخرة ${-n} يوم`
  if (n === 0) return 'تنتهي اليوم'
  if (n === 1) return 'تنتهي غداً'
  return `باقٍ ${n} يوماً`
}

/** لون الشارة بحسب الأيام المتبقية — نفس مراحل تنبيه الحارس (7، 3، 1، 0). */
export function urgencyClass(n: number, open = true): string {
  if (!open) return 'bg-gray-100 text-gray-600'
  if (n < 0) return 'bg-red-700 text-white'
  if (n <= 1) return 'bg-red-100 text-red-800'
  if (n <= 3) return 'bg-amber-100 text-amber-900'
  if (n <= 7) return 'bg-yellow-50 text-yellow-900'
  return 'bg-green-50 text-green-800'
}
