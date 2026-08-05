<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import api from '@/api/client'
import type { LegalReference, LegalReferenceType } from '@/api/types'

const items = ref<LegalReference[]>([])
const search = ref('')
const typeFilter = ref<'' | LegalReferenceType>('')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<LegalReference[]>('/legal-references', {
      params: { q: search.value || undefined, type: typeFilter.value || undefined }
    })
    items.value = data
  } finally {
    loading.value = false
  }
}

onMounted(load)

let debounce: ReturnType<typeof setTimeout>
watch(search, () => {
  clearTimeout(debounce)
  debounce = setTimeout(load, 300)
})
watch(typeFilter, load)

const typeLabel: Record<LegalReferenceType, string> = {
  Law: 'نظام',
  Regulation: 'لائحة',
  Decision: 'قرار',
  Circular: 'تعميم',
  Other: 'أخرى'
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-bold text-gray-900">الأرشيف القانوني</h1>
      <router-link
        to="/legal-archive/new"
        class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        إضافة مرجع
      </router-link>
    </div>

    <div class="mb-4 flex gap-3">
      <input
        v-model="search"
        type="text"
        placeholder="ابحث بالعنوان أو الرقم المرجعي..."
        class="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <select v-model="typeFilter" class="rounded-lg border border-gray-300 px-3 py-2 text-sm">
        <option value="">كل الأنواع</option>
        <option value="Law">نظام</option>
        <option value="Regulation">لائحة</option>
        <option value="Decision">قرار</option>
        <option value="Circular">تعميم</option>
        <option value="Other">أخرى</option>
      </select>
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <table class="w-full text-right text-sm">
        <thead class="bg-gray-50 text-gray-500">
          <tr>
            <th class="px-4 py-3 font-medium">العنوان</th>
            <th class="px-4 py-3 font-medium">النوع</th>
            <th class="px-4 py-3 font-medium">الجهة المُصدِرة</th>
            <th class="px-4 py-3 font-medium">تاريخ الصدور</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in items" :key="l.id" class="border-t border-gray-100 hover:bg-gray-50">
            <td class="px-4 py-3">
              <router-link :to="`/legal-archive/${l.id}`" class="font-medium text-emerald-700">{{ l.title }}</router-link>
            </td>
            <td class="px-4 py-3">{{ typeLabel[l.type] }}</td>
            <td class="px-4 py-3">{{ l.issuingAuthority || '—' }}</td>
            <td class="px-4 py-3">{{ l.issueDate || '—' }}</td>
          </tr>
          <tr v-if="!loading && items.length === 0">
            <td colspan="4" class="px-4 py-6 text-center text-gray-400">لا توجد مراجع بعد</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
