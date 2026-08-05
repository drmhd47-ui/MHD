<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api, { apiErrorMessage } from '@/api/client'
import type { AppointmentType, CaseItem } from '@/api/types'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const isEdit = !!props.id

const cases = ref<CaseItem[]>([])
const form = ref({
  title: '',
  type: 'Meeting' as AppointmentType,
  caseId: '',
  startAt: '',
  endAt: '',
  location: '',
  notes: '',
  reminderMinutesBefore: 60 as number | null
})

const error = ref('')
const saving = ref(false)

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(async () => {
  const { data } = await api.get<CaseItem[]>('/cases')
  cases.value = data

  if (isEdit) {
    const { data: item } = await api.get(`/appointments/${props.id}`)
    form.value = {
      title: item.title,
      type: item.type,
      caseId: item.caseId || '',
      startAt: toLocalInput(item.startAt),
      endAt: item.endAt ? toLocalInput(item.endAt) : '',
      location: item.location || '',
      notes: item.notes || '',
      reminderMinutesBefore: item.reminderMinutesBefore ?? null
    }
  } else {
    form.value.startAt = toLocalInput(new Date().toISOString())
  }
})

async function save() {
  error.value = ''
  saving.value = true
  try {
    const payload = {
      title: form.value.title,
      type: form.value.type,
      caseId: form.value.caseId || null,
      startAt: new Date(form.value.startAt).toISOString(),
      endAt: form.value.endAt ? new Date(form.value.endAt).toISOString() : null,
      location: form.value.location || null,
      notes: form.value.notes || null,
      reminderMinutesBefore: form.value.reminderMinutesBefore
    }
    if (isEdit) {
      await api.put(`/appointments/${props.id}`, payload)
    } else {
      await api.post('/appointments', payload)
    }
    router.push('/appointments')
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="mb-6 text-xl font-bold text-gray-900">{{ isEdit ? 'تعديل موعد' : 'موعد جديد' }}</h1>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

    <form class="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm" @submit.prevent="save">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">العنوان</label>
        <input v-model="form.title" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">النوع</label>
          <select v-model="form.type" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="Hearing">جلسة</option>
            <option value="Meeting">اجتماع</option>
            <option value="Deadline">موعد نهائي</option>
            <option value="Other">أخرى</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">القضية (اختياري)</label>
          <select v-model="form.caseId" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">بلا قضية مرتبطة</option>
            <option v-for="c in cases" :key="c.id" :value="c.id">{{ c.caseNumber }} — {{ c.title }}</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">البداية</label>
          <input v-model="form.startAt" type="datetime-local" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">النهاية (اختياري)</label>
          <input v-model="form.endAt" type="datetime-local" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">الموقع</label>
          <input v-model="form.location" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">تذكير قبل (دقيقة)</label>
          <input v-model.number="form.reminderMinutesBefore" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">ملاحظات</label>
        <textarea v-model="form.notes" rows="3" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"></textarea>
      </div>
      <div class="flex justify-end gap-2">
        <button
          type="submit"
          :disabled="saving"
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {{ saving ? '...جارٍ الحفظ' : 'حفظ' }}
        </button>
      </div>
    </form>
  </div>
</template>
