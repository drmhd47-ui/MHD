<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { Client, CaseItem } from '@/api/types'

const clientsCount = ref<number | null>(null)
const openCasesCount = ref<number | null>(null)
const newIntakeCount = ref<number | null>(null)
const auth = useAuthStore()

onMounted(async () => {
  try {
    const [clientsRes, casesRes, intakeRes] = await Promise.all([
      api.get<Client[]>('/clients'),
      api.get<CaseItem[]>('/cases', { params: { status: 'Open' } }),
      api.get<{ newCount: number }>('/intake-requests/summary')
    ])
    clientsCount.value = clientsRes.data.length
    openCasesCount.value = casesRes.data.length
    newIntakeCount.value = intakeRes.data.newCount
  } catch {
    // تجاهل الخطأ في لوحة العدّادات فقط
  }
})
</script>

<template>
  <div>
    <h1 class="mb-1 text-xl font-bold text-gray-900">مرحباً، {{ auth.user?.fullName }}</h1>
    <p class="mb-6 text-sm text-gray-500">نظرة سريعة على نشاط المكتب</p>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <router-link to="/intake-requests" class="rounded-xl border border-gold bg-white p-5 shadow-sm hover:bg-brand-50">
        <p class="text-sm text-gray-500">طلبات الموقع الجديدة</p>
        <p class="mt-1 text-2xl font-bold text-brand-700">{{ newIntakeCount ?? '—' }}</p>
      </router-link>
      <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <p class="text-sm text-gray-500">عدد العملاء</p>
        <p class="mt-1 text-2xl font-bold text-brand-700">{{ clientsCount ?? '—' }}</p>
      </div>
      <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <p class="text-sm text-gray-500">القضايا المفتوحة</p>
        <p class="mt-1 text-2xl font-bold text-brand-700">{{ openCasesCount ?? '—' }}</p>
      </div>
    </div>
  </div>
</template>
