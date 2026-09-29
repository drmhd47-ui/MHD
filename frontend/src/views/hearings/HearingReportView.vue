<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import type { Hearing } from '@/api/types'
import { formatDateTime, fromRiyadhInput } from '@/utils/dates'
import { hearingStatusLabel } from './labels'

const props = defineProps<{ id: string }>()
const hearing = ref<Hearing | null>(null)
const form = ref({ outcome: 'Held' as 'Held' | 'Postponed', report: '', nextHearingAt: '', nextPurpose: '' })
const error = ref('')
const saving = ref(false)
const saved = ref(false)

onMounted(async () => {
  const { data } = await api.get<Hearing>(`/hearings/${props.id}`)
  hearing.value = data
})

async function save() {
  error.value = ''
  saving.value = true
  try {
    const { data } = await api.post<Hearing>(`/hearings/${props.id}/report`, {
      outcome: form.value.outcome,
      report: form.value.report,
      nextHearingAt: form.value.nextHearingAt ? fromRiyadhInput(form.value.nextHearingAt) : null,
      nextPurpose: form.value.nextPurpose || null
    })
    hearing.value = data
    saved.value = true
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="hearing" class="max-w-2xl">
    <h1 class="mb-1 text-xl font-bold text-gray-900">تقرير جلسة — {{ hearing.caseNumber }}</h1>
    <p class="mb-6 text-sm text-gray-500">
      {{ formatDateTime(hearing.scheduledAt) }} · {{ hearing.court || '—' }} {{ hearing.circuit ? `· ${hearing.circuit}` : '' }} · المترافع:
      {{ hearing.lawyerName }}
    </p>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

    <div v-if="hearing.status !== 'Scheduled'" class="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <p class="text-sm"><span class="text-gray-500">النتيجة:</span> {{ hearingStatusLabel[hearing.status] }}</p>
      <p v-if="hearing.report" class="whitespace-pre-line text-sm leading-7">{{ hearing.report }}</p>
      <div v-if="saved || hearing.status === 'Held'" class="rounded-lg border border-gold bg-cream p-4 text-sm">
        <p class="mb-2 font-medium text-brand-700">إن صدر حكم في هذه الجلسة</p>
        <p class="mb-3 text-gray-700">أنشئ مهلة الاعتراض الآن من تاريخ تسلّم صورة الحكم، ليتابعها حارس المهل بمسؤول ونائب.</p>
        <router-link :to="`/deadlines/new?caseId=${hearing.caseId}`" class="rounded-lg bg-brand-600 px-3 py-2 text-white hover:bg-brand-700">
          إنشاء مهلة اعتراض
        </router-link>
      </div>
      <router-link v-if="hearing.nextHearingId" :to="`/hearings/${hearing.nextHearingId}`" class="block text-sm text-brand-700 hover:underline">
        الجلسة التالية ←
      </router-link>
    </div>

    <form v-else class="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm" @submit.prevent="save">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">نتيجة الجلسة</label>
        <select v-model="form.outcome" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="Held">انعقدت</option>
          <option value="Postponed">أُجّلت</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">تقرير الجلسة</label>
        <textarea
          v-model="form.report"
          rows="6"
          required
          placeholder="ما دار في الجلسة، وما قدّمه كل طرف، وما قررته الدائرة، والمطلوب قبل الجلسة التالية."
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        ></textarea>
        <p class="mt-1 text-xs text-gray-500">تقرير داخلي. يُبلَّغ العميل بملخصه بقرار المحامي المسؤول.</p>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">موعد الجلسة التالية (اختياري)</label>
          <input v-model="form.nextHearingAt" type="datetime-local" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">غرض الجلسة التالية</label>
          <input v-model="form.nextPurpose" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div class="flex justify-end">
        <button type="submit" :disabled="saving" class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {{ saving ? '...جارٍ الحفظ' : 'حفظ التقرير' }}
        </button>
      </div>
    </form>
  </div>
</template>
