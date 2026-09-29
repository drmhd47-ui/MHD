<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import api from '@/api/client'
import type { Client } from '@/api/types'

const clients = ref<Client[]>([])
const search = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<Client[]>('/clients', { params: { q: search.value || undefined } })
    clients.value = data
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
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-bold text-gray-900">العملاء</h1>
      <router-link
        to="/clients/new"
        class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        عميل جديد
      </router-link>
    </div>

    <input
      v-model="search"
      type="text"
      placeholder="ابحث بالاسم أو الهوية..."
      class="mb-4 w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm"
    />

    <div class="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
      <table class="w-full min-w-[40rem] text-right text-sm">
        <thead class="bg-gray-50 text-gray-500">
          <tr>
            <th class="px-4 py-3 font-medium">الاسم</th>
            <th class="px-4 py-3 font-medium">النوع</th>
            <th class="px-4 py-3 font-medium">الجوال</th>
            <th class="px-4 py-3 font-medium">تاريخ الإضافة</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in clients" :key="c.id" class="border-t border-gray-100 hover:bg-gray-50">
            <td class="px-4 py-3">
              <router-link :to="`/clients/${c.id}`" class="font-medium text-brand-700">{{ c.fullName }}</router-link>
            </td>
            <td class="px-4 py-3">{{ c.type === 'Individual' ? 'فرد' : 'شركة' }}</td>
            <td class="px-4 py-3">{{ c.phone || '—' }}</td>
            <td class="px-4 py-3">{{ new Date(c.createdAt).toLocaleDateString('ar-SA') }}</td>
          </tr>
          <tr v-if="!loading && clients.length === 0">
            <td colspan="4" class="px-4 py-6 text-center text-gray-400">لا يوجد عملاء بعد</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
