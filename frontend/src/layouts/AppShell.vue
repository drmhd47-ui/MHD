<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import logo from '@/assets/logo-mark.svg'

const auth = useAuthStore()
const router = useRouter()

// عدد طلبات الموقع الجديدة — يُحدَّث كل دقيقة ليرى المحامي المناوب الطلبات حتى دون بريد.
const newIntake = ref(0)
async function refreshIntake() {
  try {
    const { data } = await api.get<{ newCount: number }>('/intake-requests/summary')
    newIntake.value = data.newCount
  } catch {
    // العدّاد إضافي؛ لا يعطّل الواجهة إن تعذّر
  }
}
let timer: ReturnType<typeof setInterval>
onMounted(() => {
  refreshIntake()
  timer = setInterval(refreshIntake, 60000)
})
onUnmounted(() => clearInterval(timer))

const navItems = computed(() => {
  const items: { to: string; label: string; badge?: number }[] = [
    { to: '/', label: 'الرئيسية' },
    { to: '/intake-requests', label: 'طلبات الموقع', badge: newIntake.value },
    { to: '/clients', label: 'العملاء' },
    { to: '/cases', label: 'القضايا والملفات' },
    { to: '/appointments', label: 'الجدولة والمواعيد' },
    { to: '/legal-archive', label: 'الأرشيف القانوني' }
  ]
  if (auth.isManager) {
    items.push({ to: '/invoices', label: 'الفواتير والمدفوعات' })
    items.push({ to: '/users', label: 'إدارة المستخدمين' })
    items.push({ to: '/audit-log', label: 'سجل التدقيق' })
    items.push({ to: '/settings/office', label: 'إعدادات المكتب' })
  }
  return items
})

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex min-h-screen bg-gray-50 text-gray-900" dir="rtl">
    <aside class="flex w-64 shrink-0 flex-col border-l border-gray-200 bg-white">
      <div class="flex items-center gap-3 border-b border-gray-100 px-5 py-5">
        <span class="rounded-lg border border-gold bg-cream p-1">
          <img :src="logo" alt="" class="h-14 w-auto" />
        </span>
        <div>
          <h1 class="text-base font-bold text-brand-700">مجموعة إم القانونية</h1>
          <p class="mt-0.5 text-xs text-gray-500">النظام الداخلي</p>
        </div>
      </div>

      <nav class="flex-1 space-y-1 p-3">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-700"
          active-class="bg-brand-50 text-brand-700"
        >
          <span class="flex items-center justify-between">
            {{ item.label }}
            <span
              v-if="item.badge"
              class="rounded-full bg-gold px-2 text-xs font-bold text-brand-700"
              :aria-label="`طلبات جديدة: ${item.badge}`"
              >{{ item.badge }}</span
            >
          </span>
        </router-link>
      </nav>

      <div class="border-t border-gray-100 p-3">
        <p class="px-3 text-sm text-gray-700">{{ auth.user?.fullName }}</p>
        <p class="mb-2 px-3 text-xs text-gray-400">{{ auth.user?.role === 'Manager' ? 'مدير المكتب' : 'محامٍ' }}</p>
        <button
          class="w-full rounded-lg px-3 py-2 text-right text-sm font-medium text-red-600 hover:bg-red-50"
          @click="handleLogout"
        >
          تسجيل الخروج
        </button>
      </div>
    </aside>

    <main class="flex-1 p-6">
      <router-view />
    </main>
  </div>
</template>
