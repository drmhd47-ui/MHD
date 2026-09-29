<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import api from '@/api/client'
import type { CaseItem, CaseStatus } from '@/api/types'

const cases = ref<CaseItem[]>([])
const search = ref('')
const statusFilter = ref<'' | CaseStatus>('Open')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<CaseItem[]>('/cases', {
      params: { q: search.value || undefined, status: statusFilter.value || undefined }
    })
    cases.value = data
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
watch(statusFilter, load)

const statusLabel: Record<CaseStatus, string> = { Open: 'مفتوحة', Closed: 'مغلقة', Archived: 'مؤرشفة' }
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-bold text-gray-900">القضايا والملفات</h1>
      <router-link
        to="/cases/new"
        class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        قضية جديدة
      </router-link>
    </div>

    <div class="mb-4 flex gap-3">
      <input
        v-model="search"
        type="text"
        placeholder="ابحث برقم القضية أو الموضوع أو اسم العميل..."
        class="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <select v-model="statusFilter" class="rounded-lg border border-gray-300 px-3 py-2 text-sm">
        <option value="">كل الحالات</option>
        <option value="Open">مفتوحة</option>
        <option value="Closed">مغلقة</option>
        <option value="Archived">مؤرشفة</option>
      </select>
    </div>

    <div class="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
      <table class="w-full min-w-[40rem] text-right text-sm">
        <thead class="bg-gray-50 text-gray-500">
          <tr>
            <th class="px-4 py-3 font-medium">رقم القضية</th>
            <th class="px-4 py-3 font-medium">الموضوع</th>
            <th class="px-4 py-3 font-medium">العميل</th>
            <th class="px-4 py-3 font-medium">الحالة</th>
            <th class="px-4 py-3 font-medium">تاريخ الفتح</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in cases" :key="c.id" class="border-t border-gray-100 hover:bg-gray-50">
            <td class="px-4 py-3">
              <router-link :to="`/cases/${c.id}`" class="font-medium text-brand-700">{{ c.caseNumber }}</router-link>
            </td>
            <td class="px-4 py-3">{{ c.title }}</td>
            <td class="px-4 py-3">{{ c.client?.fullName || '—' }}</td>
            <td class="px-4 py-3">{{ statusLabel[c.status] }}</td>
            <td class="px-4 py-3">{{ c.openedDate }}</td>
          </tr>
          <tr v-if="!loading && cases.length === 0">
            <td colspan="5" class="px-4 py-6 text-center text-gray-400">لا توجد قضايا</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
