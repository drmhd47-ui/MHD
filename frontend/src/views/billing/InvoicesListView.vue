<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import api from '@/api/client'
import type { Invoice, InvoiceStatus } from '@/api/types'

const invoices = ref<Invoice[]>([])
const statusFilter = ref<'' | InvoiceStatus>('')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<Invoice[]>('/invoices', { params: { status: statusFilter.value || undefined } })
    invoices.value = data
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(statusFilter, load)

const statusLabel: Record<InvoiceStatus, string> = { Draft: 'مسودة', Issued: 'صادرة', Paid: 'مدفوعة', Cancelled: 'ملغاة' }
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-bold text-gray-900">الفواتير والمدفوعات</h1>
      <router-link
        to="/invoices/new"
        class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        فاتورة جديدة
      </router-link>
    </div>

    <select v-model="statusFilter" class="mb-4 rounded-lg border border-gray-300 px-3 py-2 text-sm">
      <option value="">كل الحالات</option>
      <option value="Draft">مسودة</option>
      <option value="Issued">صادرة</option>
      <option value="Paid">مدفوعة</option>
      <option value="Cancelled">ملغاة</option>
    </select>

    <div class="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
      <table class="w-full min-w-[40rem] text-right text-sm">
        <thead class="bg-gray-50 text-gray-500">
          <tr>
            <th class="px-4 py-3 font-medium">رقم الفاتورة</th>
            <th class="px-4 py-3 font-medium">العميل</th>
            <th class="px-4 py-3 font-medium">تاريخ الإصدار</th>
            <th class="px-4 py-3 font-medium">الإجمالي</th>
            <th class="px-4 py-3 font-medium">الحالة</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in invoices" :key="i.id" class="border-t border-gray-100 hover:bg-gray-50">
            <td class="px-4 py-3">
              <router-link :to="`/invoices/${i.id}`" class="font-medium text-brand-700">{{ i.invoiceNumber || 'مسودة' }}</router-link>
            </td>
            <td class="px-4 py-3">{{ i.client?.fullName || '—' }}</td>
            <td class="px-4 py-3">{{ i.issueDate }}</td>
            <td class="px-4 py-3">{{ i.total.toFixed(2) }}</td>
            <td class="px-4 py-3">{{ statusLabel[i.status] }}</td>
          </tr>
          <tr v-if="!loading && invoices.length === 0">
            <td colspan="5" class="px-4 py-6 text-center text-gray-400">لا توجد فواتير</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
