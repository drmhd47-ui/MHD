<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import type { ManagedUser, VatStatus } from '@/api/types'

const form = ref({
  firmName: '',
  vatNumber: '',
  commercialRegistrationNumber: '',
  address: '',
  phone: '',
  email: '',
  defaultVatRate: 0.15,
  isVatRegistered: false,
  onDutyUserId: null as string | null
})
const users = ref<ManagedUser[]>([])
const vat = ref<VatStatus | null>(null)
const sar = (n: number) => n.toLocaleString('ar-SA-u-nu-latn', { maximumFractionDigits: 0 })

const error = ref('')
const success = ref(false)
const saving = ref(false)

onMounted(async () => {
  const [{ data }, usersRes, vatRes] = await Promise.all([
    api.get('/office-settings'),
    api.get<ManagedUser[]>('/users'),
    api.get<VatStatus>('/invoices/vat-status')
  ])
  form.value = { ...form.value, ...data, vatNumber: data.vatNumber || '' }
  vat.value = vatRes.data
  users.value = usersRes.data.filter((u) => u.isActive)
})

async function save() {
  error.value = ''
  success.value = false
  saving.value = true
  try {
    await api.put('/office-settings', { ...form.value, vatNumber: form.value.isVatRegistered ? form.value.vatNumber : null })
    success.value = true
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-xl">
    <h1 class="mb-6 text-xl font-bold text-gray-900">إعدادات المكتب</h1>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="success" class="mb-4 rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">
      تم الحفظ بنجاح
    </p>

    <form class="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm" @submit.prevent="save">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">اسم المكتب</label>
        <input v-model="form.firmName" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">رقم السجل التجاري</label>
        <input v-model="form.commercialRegistrationNumber" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <fieldset class="space-y-3 rounded-lg border border-gray-200 p-4">
        <legend class="px-1 text-sm font-medium text-gray-700">ضريبة القيمة المضافة</legend>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="form.isVatRegistered" type="checkbox" /> الشركة مسجّلة في ضريبة القيمة المضافة
        </label>
        <p v-if="!form.isVatRegistered" class="text-xs text-gray-500">
          غير مسجّلة: تصدر الفواتير بلا ضريبة ولا رقم ضريبي ولا رمز فاتورة ضريبية. فعّل هذا الخيار فقط بعد صدور شهادة التسجيل.
        </p>
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">رقم التسجيل الضريبي (15 رقماً)</label>
            <input v-model="form.vatNumber" inputmode="numeric" maxlength="15" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">نسبة الضريبة</label>
            <input v-model.number="form.defaultVatRate" type="number" step="0.01" min="0.01" max="0.99" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div
          v-if="vat && !vat.isVatRegistered"
          class="rounded-lg p-3 text-xs leading-6"
          :class="vat.level === 'mandatory' ? 'bg-red-50 text-red-800' : vat.level === 'approaching' ? 'bg-amber-50 text-amber-900' : 'bg-gray-50 text-gray-600'"
        >
          إيرادات الفواتير الصادرة في آخر 12 شهراً: <strong>{{ sar(vat.trailing12MonthsRevenue) }} ريال</strong>.
          حد التسجيل الإلزامي {{ sar(vat.mandatoryThreshold) }} ريال، والاختياري {{ sar(vat.voluntaryThreshold) }} ريال.
          <span v-if="vat.level === 'mandatory'"> تجاوزت الإيرادات حد التسجيل الإلزامي — يلزم التسجيل لدى هيئة الزكاة والضريبة والجمارك خلال المدة النظامية.</span>
          <span v-else-if="vat.level === 'approaching'"> الإيرادات تقترب من حد التسجيل الإلزامي — استعدّوا للتسجيل.</span>
          <span class="block text-gray-500">تقدير داخلي للتنبيه؛ يُراجَع احتساب الإيرادات الخاضعة مع محاسب.</span>
        </div>
      </fieldset>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">العنوان</label>
        <input v-model="form.address" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">الجوال</label>
          <input v-model="form.phone" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
          <input v-model="form.email" type="email" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="on-duty">المحامي المناوب لطلبات الموقع</label>
        <select id="on-duty" v-model="form.onDutyUserId" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option :value="null">غير محدد — يُشعَر المديرون</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.fullName }}</option>
        </select>
        <p class="mt-1 text-xs text-gray-500">يصله إشعار بريدي برقم كل طلب جديد فقط، بلا بيانات مقدم الطلب.</p>
      </div>
      <div class="flex justify-end">
        <button
          type="submit"
          :disabled="saving"
          class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {{ saving ? '...جارٍ الحفظ' : 'حفظ' }}
        </button>
      </div>
    </form>
  </div>
</template>
