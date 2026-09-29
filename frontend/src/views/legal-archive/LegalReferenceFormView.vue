<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api, { apiErrorMessage } from '@/api/client'
import type { LegalReferenceType } from '@/api/types'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const isEdit = !!props.id

const form = ref({
  title: '',
  type: 'Law' as LegalReferenceType,
  issuingAuthority: '',
  issueDate: '',
  referenceNumber: '',
  summary: '',
  sourceUrl: ''
})

const error = ref('')
const saving = ref(false)

onMounted(async () => {
  if (isEdit) {
    const { data } = await api.get(`/legal-references/${props.id}`)
    form.value = { ...form.value, ...data, issueDate: data.issueDate || '' }
  }
})

async function save() {
  error.value = ''
  saving.value = true
  try {
    const payload = { ...form.value, issueDate: form.value.issueDate || null }
    if (isEdit) {
      await api.put(`/legal-references/${props.id}`, payload)
    } else {
      await api.post('/legal-references', payload)
    }
    router.push('/legal-archive')
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!isEdit) return
  await api.delete(`/legal-references/${props.id}`)
  router.push('/legal-archive')
}
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="mb-6 text-xl font-bold text-gray-900">{{ isEdit ? 'تعديل مرجع قانوني' : 'إضافة مرجع قانوني' }}</h1>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

    <form class="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm" @submit.prevent="save">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">العنوان</label>
        <input v-model="form.title" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">النوع</label>
          <select v-model="form.type" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="Law">نظام</option>
            <option value="Regulation">لائحة</option>
            <option value="Decision">قرار</option>
            <option value="Circular">تعميم</option>
            <option value="Other">أخرى</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">الرقم المرجعي</label>
          <input v-model="form.referenceNumber" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">الجهة المُصدِرة</label>
          <input v-model="form.issuingAuthority" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">تاريخ الصدور</label>
          <input v-model="form.issueDate" type="date" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">رابط المصدر</label>
        <input v-model="form.sourceUrl" type="url" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">ملخص</label>
        <textarea v-model="form.summary" rows="5" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"></textarea>
      </div>
      <div class="flex justify-between">
        <button v-if="isEdit" type="button" class="text-sm text-red-600 hover:underline" @click="remove">حذف</button>
        <div v-else></div>
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
