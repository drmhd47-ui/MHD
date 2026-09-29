<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import type { TimeEntry } from '@/api/types'

const props = defineProps<{ caseId: string }>()

const entries = ref<TimeEntry[]>([])
const form = ref({ workDate: new Date().toISOString().slice(0, 10), hours: 1, description: '' })
const error = ref('')
const saving = ref(false)

async function load() {
  const { data } = await api.get<TimeEntry[]>('/time-entries', { params: { caseId: props.caseId } })
  entries.value = data
}

onMounted(load)

async function addEntry() {
  error.value = ''
  saving.value = true
  try {
    await api.post('/time-entries', { caseId: props.caseId, ...form.value })
    form.value = { workDate: new Date().toISOString().slice(0, 10), hours: 1, description: '' }
    await load()
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    saving.value = false
  }
}

async function remove(entry: TimeEntry) {
  await api.delete(`/time-entries/${entry.id}`)
  await load()
}

const totalHours = () => entries.value.reduce((sum, e) => sum + e.hours, 0)
</script>

<template>
  <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-base font-bold text-gray-900">ساعات العمل</h2>
      <span class="text-sm text-gray-500">الإجمالي: {{ totalHours() }} ساعة</span>
    </div>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

    <form class="mb-4 grid grid-cols-12 gap-2" @submit.prevent="addEntry">
      <input v-model="form.workDate" type="date" required class="col-span-3 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
      <input v-model.number="form.hours" type="number" step="0.25" min="0.25" required class="col-span-2 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
      <input v-model="form.description" placeholder="وصف العمل" required class="col-span-5 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
      <button type="submit" :disabled="saving" class="col-span-2 rounded-lg bg-brand-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
        إضافة
      </button>
    </form>

    <table class="w-full min-w-[40rem] text-right text-sm">
      <thead class="border-b border-gray-100 text-gray-500">
        <tr>
          <th class="py-2 font-medium">التاريخ</th>
          <th class="py-2 font-medium">الساعات</th>
          <th class="py-2 font-medium">الوصف</th>
          <th class="py-2 font-medium">الحالة</th>
          <th class="py-2 font-medium"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="e in entries" :key="e.id" class="border-b border-gray-50">
          <td class="py-2">{{ e.workDate }}</td>
          <td class="py-2">{{ e.hours }}</td>
          <td class="py-2">{{ e.description }}</td>
          <td class="py-2">{{ e.isBilled ? 'مُدرجة في فاتورة' : 'غير مُفوتَرة' }}</td>
          <td class="py-2">
            <button v-if="!e.isBilled" class="text-red-600 hover:underline" @click="remove(e)">حذف</button>
          </td>
        </tr>
        <tr v-if="entries.length === 0">
          <td colspan="5" class="py-6 text-center text-gray-400">لا توجد ساعات مسجَّلة بعد</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
