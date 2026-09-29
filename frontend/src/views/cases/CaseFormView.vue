<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api, { apiErrorMessage } from '@/api/client'
import type { Client } from '@/api/types'
import CaseDocumentsPanel from './CaseDocumentsPanel.vue'
import CaseTimeEntriesPanel from './CaseTimeEntriesPanel.vue'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const isEdit = !!props.id

const clients = ref<Client[]>([])
const form = ref({
  title: '',
  clientId: '',
  opposingPartyName: '',
  caseType: '',
  court: '',
  openedDate: new Date().toISOString().slice(0, 10),
  description: ''
})

const error = ref('')
const saving = ref(false)

onMounted(async () => {
  const { data } = await api.get<Client[]>('/clients')
  clients.value = data

  if (isEdit) {
    const { data: item } = await api.get(`/cases/${props.id}`)
    form.value = {
      title: item.title,
      clientId: item.clientId,
      opposingPartyName: item.opposingPartyName || '',
      caseType: item.caseType || '',
      court: item.court || '',
      openedDate: item.openedDate,
      description: item.description || ''
    }
  }
})

async function save() {
  error.value = ''
  saving.value = true
  try {
    if (isEdit) {
      await api.put(`/cases/${props.id}`, form.value)
    } else {
      await api.post('/cases', form.value)
    }
    router.push('/cases')
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="mb-6 text-xl font-bold text-gray-900">{{ isEdit ? 'تعديل قضية' : 'قضية جديدة' }}</h1>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

    <form class="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm" @submit.prevent="save">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">موضوع القضية</label>
        <input v-model="form.title" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">العميل</label>
        <select v-model="form.clientId" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="" disabled>اختر عميلاً</option>
          <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.fullName }}</option>
        </select>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">الطرف المقابل</label>
          <input v-model="form.opposingPartyName" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">نوع القضية</label>
          <input v-model="form.caseType" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">المحكمة / الجهة</label>
          <input v-model="form.court" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">تاريخ الفتح</label>
          <input v-model="form.openedDate" type="date" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">تفاصيل</label>
        <textarea v-model="form.description" rows="4" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"></textarea>
      </div>
      <div class="flex justify-end gap-2">
        <button
          type="submit"
          :disabled="saving"
          class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {{ saving ? '...جارٍ الحفظ' : 'حفظ' }}
        </button>
      </div>
    </form>

    <div v-if="isEdit && props.id" class="mt-6 space-y-6">
      <CaseDocumentsPanel :case-id="props.id" />
      <CaseTimeEntriesPanel :case-id="props.id" />
    </div>
  </div>
</template>
