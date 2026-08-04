<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const navItems = computed(() => {
  const items = [
    { to: '/', label: 'الرئيسية' },
    { to: '/clients', label: 'العملاء' },
    { to: '/cases', label: 'القضايا والملفات' }
  ]
  if (auth.isManager) {
    items.push({ to: '/users', label: 'إدارة المستخدمين' })
    items.push({ to: '/audit-log', label: 'سجل التدقيق' })
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
      <div class="border-b border-gray-100 px-5 py-6">
        <h1 class="text-lg font-bold text-emerald-700">M NEXUS</h1>
        <p class="mt-1 text-xs text-gray-500">للمحاماة والاستشارات القانونية</p>
      </div>

      <nav class="flex-1 space-y-1 p-3">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
          active-class="bg-emerald-50 text-emerald-700"
        >
          {{ item.label }}
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
