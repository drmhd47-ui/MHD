<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import api from '@/api/client'
import type { IntakeRequestListItem, IntakeRequestStatus } from '@/api/types'
import { statusClasses, statusLabels } from './labels'

const items = ref<IntakeRequestListItem[]>([])
const status = ref<IntakeRequestStatus | ''>('New')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<IntakeRequestListItem[]>('/intake-requests', { params: { status: status.value || undefined } })
    items.value = data
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(status, load)

const fmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { dateStyle: 'medium', timeStyle: 'short' })
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between">
      <h1 class="text-xl font-bold text-gray-900">طلبات الموقع</h1>
      <select v-model="status" class="rounded-lg border border-gray-300 px-3 py-2 text-sm" aria-label="تصفية حسب الحالة">
        <option value="New">الجديدة</option>
        <option value="InReview">قيد المراجعة</option>
        <option value="Converted">المحوَّلة إلى عملاء</option>
        <option value="Declined">المعتذر عنها</option>
        <option value="">الكل</option>
      </select>
    </div>
    <p class="mb-6 text-sm text-gray-500">
      طلبات الاستشارة الواردة من الموقع العام. راجع فحص تعارض المصالح في صفحة الطلب قبل التحويل إلى عميل.
    </p>

    <div class="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
      <table class="w-full min-w-[40rem] text-right text-sm">
        <thead class="bg-gray-50 text-gray-500">
          <tr>
            <th class="px-4 py-3 font-medium">رقم الطلب</th>
            <th class="px-4 py-3 font-medium">الاسم</th>
            <th class="px-4 py-3 font-medium">الخدمة</th>
            <th class="px-4 py-3 font-medium">تاريخ الورود</th>
            <th class="px-4 py-3 font-medium">الحالة</th>
            <th class="px-4 py-3 font-medium">المسؤول</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in items" :key="r.id" class="border-t border-gray-100 hover:bg-gray-50">
            <td class="px-4 py-3">
              <router-link :to="`/intake-requests/${r.id}`" class="font-medium text-brand-700 hover:underline" dir="ltr">
                {{ r.reference }}
              </router-link>
            </td>
            <td class="px-4 py-3">{{ r.fullName }}</td>
            <td class="px-4 py-3 text-gray-600">{{ r.serviceTitle ?? 'غير محدد' }}</td>
            <td class="px-4 py-3 text-gray-600">{{ fmt.format(new Date(r.submittedAt)) }}</td>
            <td class="px-4 py-3">
              <span class="rounded-full px-2.5 py-0.5 text-xs font-bold" :class="statusClasses[r.status]">{{ statusLabels[r.status] }}</span>
            </td>
            <td class="px-4 py-3 text-gray-600">{{ r.assignedUserName ?? '—' }}</td>
          </tr>
          <tr v-if="!loading && items.length === 0">
            <td colspan="6" class="px-4 py-8 text-center text-gray-500">لا توجد طلبات في هذه الحالة.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
