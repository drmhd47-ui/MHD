<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { DeadlineRule, OfficialHoliday } from '@/api/types'
import { formatDateOnly } from '@/utils/dates'

const auth = useAuthStore()
const rules = ref<DeadlineRule[]>([])
const holidays = ref<OfficialHoliday[]>([])
const error = ref('')
const info = ref('')
const editing = ref<(Omit<DeadlineRule, 'key' | 'basisVerified' | 'basisVerifiedAt'> & { isNew?: boolean }) | null>(null)
const newHoliday = ref({ date: '', name: '' })

async function load() {
  const [r, h] = await Promise.all([
    api.get<DeadlineRule[]>('/deadline-rules', { params: { includeInactive: auth.isManager } }),
    api.get<OfficialHoliday[]>('/holidays')
  ])
  rules.value = r.data
  holidays.value = h.data
}
onMounted(load)

async function run(fn: () => Promise<unknown>, done: string) {
  error.value = ''
  info.value = ''
  try {
    await fn()
    info.value = done
    await load()
  } catch (e) {
    error.value = apiErrorMessage(e)
  }
}

function verifyBasis(r: DeadlineRule) {
  if (!window.confirm(`أؤكد أنني طابقت "${r.legalBasis}" ومدة ${r.days} يوماً مع النص الرسمي النافذ.`)) return
  run(() => api.post(`/deadline-rules/${r.id}/verify-basis`), 'سُجّلت مطابقة السند باسمك')
}

function edit(r?: DeadlineRule) {
  editing.value = r
    ? { ...r }
    : { id: '', name: '', days: 30, trigger: '', legalBasis: '', isInternal: false, isActive: true, sortOrder: 100, isNew: true }
}

function saveRule() {
  const e = editing.value!
  const body = { name: e.name, days: e.days, trigger: e.trigger, legalBasis: e.legalBasis || null, isInternal: e.isInternal, isActive: e.isActive, sortOrder: e.sortOrder }
  run(async () => {
    if (e.isNew) await api.post('/deadline-rules', body)
    else await api.put(`/deadline-rules/${e.id}`, body)
    editing.value = null
  }, 'حُفظت القاعدة — أي تغيير في المدة أو السند يتطلب مطابقة جديدة')
}

async function addHoliday() {
  error.value = ''
  info.value = ''
  try {
    const { data } = await api.post('/holidays', newHoliday.value)
    newHoliday.value = { date: '', name: '' }
    await load()
    info.value = `أُضيفت العطلة. مهل أُعيد حسابها: ${data.recomputedDeadlines}`
  } catch (e) {
    error.value = apiErrorMessage(e)
  }
}

function removeHoliday(h: OfficialHoliday) {
  if (!window.confirm(`حذف عطلة ${h.name}؟ تُعاد حساب المهل المفتوحة.`)) return
  run(() => api.delete(`/holidays/${h.id}`), 'حُذفت العطلة وأُعيد حساب المهل المفتوحة')
}
</script>

<template>
  <div class="max-w-5xl">
    <h1 class="mb-1 text-xl font-bold text-gray-900">قواعد المهل والعطل الرسمية</h1>
    <p class="mb-6 text-sm text-gray-500">
      القواعد النظامية لا تُعد معتمدة حتى يطابق محامٍ مرخّص سندها (النظام والمادة والمدة) مع النص الرسمي النافذ.
    </p>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="info" class="mb-4 rounded-lg border border-green-100 bg-green-50 p-3 text-sm text-green-700">{{ info }}</p>

    <div class="mb-3 flex items-center justify-between">
      <h2 class="font-bold text-gray-900">القواعد</h2>
      <button v-if="auth.isManager" class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700" @click="edit()">قاعدة جديدة</button>
    </div>

    <div v-if="editing" class="mb-4 space-y-3 rounded-xl border border-gold bg-cream p-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input v-model="editing.name" placeholder="اسم المهلة" class="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2" />
        <input v-model.number="editing.days" type="number" min="1" max="365" class="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <input v-model="editing.trigger" placeholder="واقعة بدء السريان" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      <input
        v-model="editing.legalBasis"
        :disabled="editing.isInternal"
        placeholder="السند النظامي: اسم النظام — رقم المادة"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <div class="flex flex-wrap items-center gap-4 text-sm">
        <label class="flex items-center gap-2"><input v-model="editing.isInternal" type="checkbox" /> مهلة داخلية</label>
        <label class="flex items-center gap-2"><input v-model="editing.isActive" type="checkbox" /> مفعّلة</label>
        <button class="ms-auto rounded-lg bg-brand-600 px-3 py-1.5 text-white" @click="saveRule">حفظ</button>
        <button class="rounded-lg border border-gray-300 bg-white px-3 py-1.5" @click="editing = null">إلغاء</button>
      </div>
    </div>

    <div class="mb-8 overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
      <table class="w-full min-w-[48rem] text-right text-sm">
        <thead class="bg-gray-50 text-gray-500">
          <tr>
            <th class="px-4 py-3 font-medium">المهلة</th>
            <th class="px-4 py-3 font-medium">المدة</th>
            <th class="px-4 py-3 font-medium">السند</th>
            <th class="px-4 py-3 font-medium">المطابقة</th>
            <th class="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rules" :key="r.id" class="border-t border-gray-100 align-top" :class="!r.isActive && 'opacity-50'">
            <td class="px-4 py-3">{{ r.name }}<div class="text-xs text-gray-500">{{ r.trigger }}</div></td>
            <td class="px-4 py-3">{{ r.days }} يوماً</td>
            <td class="px-4 py-3">{{ r.isInternal ? 'داخلية' : r.legalBasis }}</td>
            <td class="px-4 py-3">
              <span v-if="r.isInternal" class="text-xs text-gray-500">لا تلزم</span>
              <span v-else-if="r.basisVerified" class="text-xs text-green-700">✓ طابقها محامٍ</span>
              <span v-else class="text-xs text-amber-800">بانتظار المطابقة</span>
            </td>
            <td class="whitespace-nowrap px-4 py-3">
              <button
                v-if="!r.isInternal && !r.basisVerified && auth.user?.isLicensedLawyer"
                class="me-3 text-sm text-brand-700 hover:underline"
                @click="verifyBasis(r)"
              >
                طابقتُ السند
              </button>
              <button v-if="auth.isManager" class="text-sm text-gray-600 hover:underline" @click="edit(r)">تعديل</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2 class="mb-3 font-bold text-gray-900">العطل الرسمية</h2>
    <p class="mb-3 text-sm text-gray-500">
      الجمعة والسبت محسوبان تلقائياً. تُضاف هنا العطل الرسمية المعلنة (كإجازتي العيدين واليوم الوطني ويوم التأسيس) بتواريخها
      المعلنة لكل عام. إضافة عطلة أو حذفها يعيد حساب المهل المفتوحة، وما تغيّر تاريخه يعود للتحقق المزدوج.
    </p>
    <form v-if="auth.isManager" class="mb-3 flex flex-wrap gap-2" @submit.prevent="addHoliday">
      <input v-model="newHoliday.date" type="date" required class="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      <input v-model="newHoliday.name" required placeholder="اسم العطلة" class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">إضافة</button>
    </form>
    <ul class="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white shadow-sm">
      <li v-for="h in holidays" :key="h.id" class="flex items-center justify-between px-4 py-2 text-sm">
        <span>{{ formatDateOnly(h.date) }} — {{ h.name }}</span>
        <button v-if="auth.isManager" class="text-red-600 hover:underline" @click="removeHoliday(h)">حذف</button>
      </li>
      <li v-if="holidays.length === 0" class="px-4 py-3 text-sm text-gray-400">لم تُسجَّل عطل رسمية بعد</li>
    </ul>
  </div>
</template>
