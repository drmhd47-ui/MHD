<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '@/api/client'
import type { Appointment } from '@/api/types'

const appointments = ref<Appointment[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<Appointment[]>('/appointments')
    appointments.value = data
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function cancel(a: Appointment) {
  await api.post(`/appointments/${a.id}/cancel`)
  await load()
}

const typeLabel: Record<string, string> = { Hearing: 'جلسة', Meeting: 'اجتماع', Deadline: 'موعد نهائي', Other: 'أخرى' }
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-bold text-gray-900">الجدولة والمواعيد</h1>
      <router-link
        to="/appointments/new"
        class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        موعد جديد
      </router-link>
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <table class="w-full text-right text-sm">
        <thead class="bg-gray-50 text-gray-500">
          <tr>
            <th class="px-4 py-3 font-medium">العنوان</th>
            <th class="px-4 py-3 font-medium">النوع</th>
            <th class="px-4 py-3 font-medium">القضية</th>
            <th class="px-4 py-3 font-medium">التاريخ والوقت</th>
            <th class="px-4 py-3 font-medium">الحالة</th>
            <th class="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in appointments" :key="a.id" class="border-t border-gray-100 hover:bg-gray-50">
            <td class="px-4 py-3">
              <router-link :to="`/appointments/${a.id}`" class="font-medium text-emerald-700">{{ a.title }}</router-link>
            </td>
            <td class="px-4 py-3">{{ typeLabel[a.type] }}</td>
            <td class="px-4 py-3">{{ a.case?.caseNumber || '—' }}</td>
            <td class="px-4 py-3">{{ new Date(a.startAt).toLocaleString('ar-SA') }}</td>
            <td class="px-4 py-3">{{ a.isCancelled ? 'مُلغى' : 'قائم' }}</td>
            <td class="px-4 py-3">
              <button v-if="!a.isCancelled" class="text-sm text-red-600 hover:underline" @click="cancel(a)">إلغاء</button>
            </td>
          </tr>
          <tr v-if="!loading && appointments.length === 0">
            <td colspan="6" class="px-4 py-6 text-center text-gray-400">لا توجد مواعيد</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
