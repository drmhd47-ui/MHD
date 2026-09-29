<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import type { DocumentMeta } from '@/api/types'

const props = defineProps<{ caseId: string }>()

const documents = ref<DocumentMeta[]>([])
const error = ref('')
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

async function load() {
  const { data } = await api.get<DocumentMeta[]>(`/cases/${props.caseId}/documents`)
  documents.value = data
}

onMounted(load)

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  error.value = ''
  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    await api.post(`/cases/${props.caseId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function download(doc: DocumentMeta) {
  const response = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data as Blob)
  const link = document.createElement('a')
  link.href = url
  link.download = doc.fileName
  link.click()
  URL.revokeObjectURL(url)
}

async function archive(doc: DocumentMeta) {
  await api.post(`/documents/${doc.id}/archive`)
  await load()
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} كيلوبايت`
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`
}
</script>

<template>
  <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-base font-bold text-gray-900">المستندات والعقود</h2>
      <label
        class="cursor-pointer rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        :class="{ 'pointer-events-none opacity-50': uploading }"
      >
        {{ uploading ? '...جارٍ الرفع' : 'رفع مستند' }}
        <input ref="fileInput" type="file" class="hidden" @change="onFileSelected" />
      </label>
    </div>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>
    <p class="mb-4 text-xs text-gray-400">
      امتدادات مسموحة: PDF، Word، Excel، PowerPoint، صور، نص. الحد الأقصى 50 ميجابايت.
    </p>

    <table class="w-full min-w-[40rem] text-right text-sm">
      <thead class="border-b border-gray-100 text-gray-500">
        <tr>
          <th class="py-2 font-medium">الملف</th>
          <th class="py-2 font-medium">الحجم</th>
          <th class="py-2 font-medium">تاريخ الرفع</th>
          <th class="py-2 font-medium"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in documents" :key="d.id" class="border-b border-gray-50">
          <td class="py-2">{{ d.fileName }}</td>
          <td class="py-2">{{ formatSize(d.sizeBytes) }}</td>
          <td class="py-2">{{ new Date(d.uploadedAt).toLocaleDateString('ar-SA') }}</td>
          <td class="py-2">
            <button class="ml-3 text-brand-700 hover:underline" @click="download(d)">تحميل</button>
            <button class="text-red-600 hover:underline" @click="archive(d)">أرشفة</button>
          </td>
        </tr>
        <tr v-if="documents.length === 0">
          <td colspan="4" class="py-6 text-center text-gray-400">لا توجد مستندات بعد</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
