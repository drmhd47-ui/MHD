<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { GuardSummary, LegalDeadline } from '@/api/types'
import { daysLeftLabel, formatDateOnly, urgencyClass } from '@/utils/dates'
import { deadlineStatusLabel } from '@/views/hearings/labels'

const auth = useAuthStore()
const deadlines = ref<LegalDeadline[]>([])
const summary = ref<GuardSummary | null>(null)
const status = ref<'Open' | ''>('Open')
const mine = ref(false)
const error = ref('')
const info = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = { status: status.value || undefined, mine: mine.value }
    const [d, s] = await Promise.all([
      api.get<LegalDeadline[]>('/deadlines', { params }),
      api.get<GuardSummary>('/deadlines/summary', { params: { mine: mine.value } })
    ])
    deadlines.value = d.data
    summary.value = s.data
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const cards = computed(() => [
  { label: 'متأخرة', value: summary.value?.overdue, cls: 'border-red-300 text-red-700' },
  { label: 'تنتهي اليوم', value: summary.value?.dueToday, cls: 'border-red-200 text-red-700' },
  { label: 'خلال 7 أيام', value: summary.value?.dueThisWeek, cls: 'border-amber-200 text-amber-800' },
  { label: 'بانتظار التحقق المزدوج', value: summary.value?.unverified, cls: 'border-gold text-brand-700' }
])

async function act(fn: () => Promise<unknown>, done: string) {
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

/** التحقق المزدوج: يحسب المتحقق التاريخ بنفسه ويدخله، ولا يُعرض عليه التاريخ المسجل ليؤكده. */
function verify(d: LegalDeadline) {
  const v = window.prompt(
    `التحقق المزدوج — ${d.title}\nواقعة البدء: ${d.triggerDate} · المدة: ${d.days} يوماً\n` +
      'احسب تاريخ الانتهاء بنفسك (مع مراعاة العطل) وأدخله بالصيغة yyyy-mm-dd:'
  )
  if (!v) return
  const date = v.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    error.value = 'اكتب التاريخ بالصيغة yyyy-mm-dd، مثل 2026-11-03'
    return
  }
  act(() => api.post(`/deadlines/${d.id}/verify`, { confirmedDueDate: date }), 'تم التحقق المزدوج من المهلة')
}

function complete(d: LegalDeadline) {
  const note = window.prompt('ما الذي تم؟ (مثل: قُدّمت لائحة الاعتراض إلكترونياً ورقم قيدها)')
  if (!note) return
  act(() => api.post(`/deadlines/${d.id}/complete`, { note }), 'أُغلقت المهلة بالإنجاز')
}

function waive(d: LegalDeadline) {
  const note = window.prompt('سبب التنازل عن المهلة (مثل: قرار العميل كتابةً بعدم الاعتراض):')
  if (!note) return
  act(() => api.post(`/deadlines/${d.id}/waive`, { note }), 'سُجّل التنازل عن المهلة')
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">حارس المهل</h1>
        <p class="text-sm text-gray-500">
          لكل مهلة مسؤول ونائب، وتحقق مزدوج من مستخدم آخر، وتنبيهات قبل الانتهاء بأسبوع ثم ثلاثة أيام ثم يوم.
        </p>
      </div>
      <div class="flex gap-2">
        <router-link to="/deadlines/rules" class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          القواعد والعطل
        </router-link>
        <router-link to="/deadlines/new" class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          مهلة جديدة
        </router-link>
      </div>
    </div>

    <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div v-for="c in cards" :key="c.label" class="rounded-xl border bg-white p-4 shadow-sm" :class="c.cls">
        <p class="text-xs text-gray-500">{{ c.label }}</p>
        <p class="mt-1 text-2xl font-bold">{{ c.value ?? '—' }}</p>
      </div>
    </div>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="info" class="mb-4 rounded-lg border border-green-100 bg-green-50 p-3 text-sm text-green-700">{{ info }}</p>

    <div class="mb-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
      <label class="flex items-center gap-2"><input v-model="mine" type="checkbox" @change="load" /> مهلي (مسؤولاً أو نائباً)</label>
      <label class="flex items-center gap-2">
        <input type="checkbox" :checked="status === ''" @change="status = status ? '' : 'Open'; load()" /> عرض المغلقة أيضاً
      </label>
    </div>

    <div class="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
      <table class="w-full min-w-[56rem] text-right text-sm">
        <thead class="bg-gray-50 text-gray-500">
          <tr>
            <th class="px-4 py-3 font-medium">المتبقي</th>
            <th class="px-4 py-3 font-medium">المهلة</th>
            <th class="px-4 py-3 font-medium">الملف</th>
            <th class="px-4 py-3 font-medium">تاريخ الانتهاء</th>
            <th class="px-4 py-3 font-medium">المسؤول / النائب</th>
            <th class="px-4 py-3 font-medium">التحقق</th>
            <th class="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in deadlines" :key="d.id" class="border-t border-gray-100 align-top">
            <td class="px-4 py-3">
              <span class="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium" :class="urgencyClass(d.daysLeft, d.status === 'Open')">
                {{ d.status === 'Open' ? daysLeftLabel(d.daysLeft) : deadlineStatusLabel[d.status] }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">{{ d.title }}</div>
              <div class="text-xs text-gray-500">
                {{ d.isInternal ? 'مهلة داخلية' : d.legalBasis }}
                <span v-if="!d.isInternal && !d.basisVerified" class="ms-1 rounded bg-amber-100 px-1 text-amber-900">السند بانتظار مطابقة محامٍ</span>
              </div>
              <div v-if="d.completionNote" class="mt-1 text-xs text-gray-600">{{ d.completionNote }}</div>
            </td>
            <td class="px-4 py-3">
              <router-link :to="`/cases/${d.caseId}`" class="whitespace-nowrap text-brand-700" dir="ltr">{{ d.caseNumber }}</router-link>
            </td>
            <td class="px-4 py-3">
              {{ formatDateOnly(d.dueDate) }}
              <div class="text-xs text-gray-500">من {{ d.triggerDate }} + {{ d.days }} يوماً</div>
              <div v-if="d.dueDateNote" class="text-xs text-amber-800">{{ d.dueDateNote }}</div>
            </td>
            <td class="px-4 py-3">{{ d.responsibleName }}<div class="text-xs text-gray-500">{{ d.backupName }}</div></td>
            <td class="px-4 py-3">
              <span v-if="d.verifiedByUserId" class="text-xs text-green-700">✓ متحقَّق منها</span>
              <span v-else class="text-xs text-red-700">غير متحقَّق منها</span>
            </td>
            <td class="whitespace-nowrap px-4 py-3">
              <template v-if="d.status === 'Open'">
                <button
                  v-if="!d.verifiedByUserId && d.createdByUserId !== auth.user?.id"
                  class="me-3 text-sm text-brand-700 hover:underline"
                  @click="verify(d)"
                >
                  تحقّق
                </button>
                <button class="me-3 text-sm text-green-700 hover:underline" @click="complete(d)">إنجاز</button>
                <router-link :to="`/deadlines/${d.id}`" class="me-3 text-sm text-gray-600 hover:underline">تعديل</router-link>
                <button v-if="auth.isManager" class="text-sm text-red-600 hover:underline" @click="waive(d)">تنازل</button>
              </template>
            </td>
          </tr>
          <tr v-if="!loading && deadlines.length === 0">
            <td colspan="7" class="px-4 py-6 text-center text-gray-400">لا توجد مهل</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
