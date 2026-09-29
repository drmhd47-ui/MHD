<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import type { Hearing } from '@/api/types'
import { formatDateTime } from '@/utils/dates'
import { hearingStatusLabel } from './labels'

const hearings = ref<Hearing[]>([])
const loading = ref(false)
const error = ref('')
const tab = ref<'upcoming' | 'awaiting' | 'past'>('upcoming')
const mine = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get<Hearing[]>('/hearings', { params: { mine: mine.value } })
    hearings.value = data
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

const now = () => Date.now()
/** جلسة مجدولة مرّ موعدها ولم يُسجَّل تقريرها. */
const awaitingReport = (h: Hearing) => h.status === 'Scheduled' && new Date(h.scheduledAt).getTime() < now()

const shown = computed(() => {
  if (tab.value === 'upcoming')
    return hearings.value.filter((h) => h.status === 'Scheduled' && !awaitingReport(h))
  if (tab.value === 'awaiting') return hearings.value.filter(awaitingReport)
  return hearings.value.filter((h) => h.status !== 'Scheduled').slice().reverse()
})
const awaitingCount = computed(() => hearings.value.filter(awaitingReport).length)

async function cancel(h: Hearing) {
  const reason = window.prompt('سبب إلغاء الجلسة (يُحفظ في سجل التدقيق):')
  if (reason === null) return
  try {
    await api.post(`/hearings/${h.id}/cancel`, { reason })
    await load()
  } catch (e) {
    error.value = apiErrorMessage(e)
  }
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">الجلسات وتقاريرها</h1>
        <p class="text-sm text-gray-500">المترافع محامٍ مرخّص، ويُسجَّل تقرير كل جلسة بعد انعقادها.</p>
      </div>
      <router-link to="/hearings/new" class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
        جلسة جديدة
      </router-link>
    </div>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <button
        v-for="t in [
          { k: 'upcoming', l: 'القادمة' },
          { k: 'awaiting', l: `بانتظار التقرير (${awaitingCount})` },
          { k: 'past', l: 'المنتهية والملغاة' }
        ]"
        :key="t.k"
        class="rounded-full border px-3 py-1 text-sm"
        :class="tab === t.k ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 bg-white text-gray-700'"
        @click="tab = t.k as typeof tab"
      >
        {{ t.l }}
      </button>
      <label class="ms-auto flex items-center gap-2 text-sm text-gray-600">
        <input v-model="mine" type="checkbox" @change="load" /> جلساتي فقط
      </label>
    </div>

    <div class="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
      <table class="w-full min-w-[48rem] text-right text-sm">
        <thead class="bg-gray-50 text-gray-500">
          <tr>
            <th class="px-4 py-3 font-medium">الموعد (الرياض)</th>
            <th class="px-4 py-3 font-medium">الملف</th>
            <th class="px-4 py-3 font-medium">المحكمة والدائرة</th>
            <th class="px-4 py-3 font-medium">المترافع / المساند</th>
            <th class="px-4 py-3 font-medium">الحالة</th>
            <th class="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in shown" :key="h.id" class="border-t border-gray-100 align-top hover:bg-gray-50">
            <td class="px-4 py-3">{{ formatDateTime(h.scheduledAt) }}</td>
            <td class="px-4 py-3">
              <router-link :to="`/cases/${h.caseId}`" class="whitespace-nowrap font-medium text-brand-700" dir="ltr">{{ h.caseNumber }}</router-link>
              <div class="text-xs text-gray-500">{{ h.purpose || h.caseTitle }}</div>
            </td>
            <td class="px-4 py-3">{{ h.court || '—' }}<div class="text-xs text-gray-500">{{ h.circuit }}</div></td>
            <td class="px-4 py-3">{{ h.lawyerName }}<div v-if="h.supportUserName" class="text-xs text-gray-500">{{ h.supportUserName }}</div></td>
            <td class="px-4 py-3">
              <span
                class="rounded-full px-2 py-0.5 text-xs"
                :class="awaitingReport(h) ? 'bg-red-100 text-red-800' : 'bg-brand-50 text-brand-700'"
              >
                {{ awaitingReport(h) ? 'التقرير مطلوب' : hearingStatusLabel[h.status] }}
              </span>
            </td>
            <td class="whitespace-nowrap px-4 py-3">
              <template v-if="h.status === 'Scheduled'">
                <router-link :to="`/hearings/${h.id}/report`" class="me-3 text-sm text-brand-700 hover:underline">تسجيل التقرير</router-link>
                <router-link :to="`/hearings/${h.id}`" class="me-3 text-sm text-gray-600 hover:underline">تعديل</router-link>
                <button class="text-sm text-red-600 hover:underline" @click="cancel(h)">إلغاء</button>
              </template>
              <router-link v-else :to="`/hearings/${h.id}/report`" class="text-sm text-gray-600 hover:underline">عرض التقرير</router-link>
            </td>
          </tr>
          <tr v-if="!loading && shown.length === 0">
            <td colspan="6" class="px-4 py-6 text-center text-gray-400">لا توجد جلسات في هذا القسم</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
