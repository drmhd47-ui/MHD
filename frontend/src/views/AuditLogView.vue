<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '@/api/client'
import type { AuditEntry } from '@/api/types'

const items = ref<AuditEntry[]>([])
const page = ref(1)
const total = ref(0)
const pageSize = 50

async function load() {
  const { data } = await api.get('/audit-log', { params: { page: page.value, pageSize } })
  items.value = data.items
  total.value = data.total
}

onMounted(load)

function nextPage() {
  if (page.value * pageSize < total.value) {
    page.value++
    load()
  }
}
function prevPage() {
  if (page.value > 1) {
    page.value--
    load()
  }
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-xl font-bold text-gray-900">سجل التدقيق</h1>

    <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <table class="w-full text-right text-sm">
        <thead class="bg-gray-50 text-gray-500">
          <tr>
            <th class="px-4 py-3 font-medium">الوقت</th>
            <th class="px-4 py-3 font-medium">المستخدم</th>
            <th class="px-4 py-3 font-medium">الإجراء</th>
            <th class="px-4 py-3 font-medium">العنصر</th>
            <th class="px-4 py-3 font-medium">عنوان IP</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in items" :key="e.id" class="border-t border-gray-100">
            <td class="whitespace-nowrap px-4 py-3">{{ new Date(e.timestamp).toLocaleString('ar-SA') }}</td>
            <td class="px-4 py-3">{{ e.userName }}</td>
            <td class="px-4 py-3 font-mono text-xs">{{ e.action }}</td>
            <td class="px-4 py-3">
              {{ e.entityType }}<span v-if="e.entityId" class="text-gray-400"> #{{ e.entityId.slice(0, 8) }}</span>
            </td>
            <td class="px-4 py-3">{{ e.ipAddress }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4 flex items-center justify-between text-sm text-gray-500">
      <span>الصفحة {{ page }} من {{ Math.max(1, Math.ceil(total / pageSize)) }} — إجمالي {{ total }} سجل</span>
      <div class="flex gap-2">
        <button class="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40" :disabled="page <= 1" @click="prevPage">
          السابق
        </button>
        <button
          class="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
          :disabled="page * pageSize >= total"
          @click="nextPage"
        >
          التالي
        </button>
      </div>
    </div>
  </div>
</template>
