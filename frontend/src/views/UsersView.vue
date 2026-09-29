<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import type { ManagedUser, UserRole } from '@/api/types'

const users = ref<ManagedUser[]>([])
const form = ref({ fullName: '', email: '', role: 'Lawyer' as UserRole, temporaryPassword: '' })
const error = ref('')
const saving = ref(false)

async function load() {
  const { data } = await api.get<ManagedUser[]>('/users')
  users.value = data
}

onMounted(load)

async function createUser() {
  error.value = ''
  saving.value = true
  try {
    await api.post('/users', form.value)
    form.value = { fullName: '', email: '', role: 'Lawyer', temporaryPassword: '' }
    await load()
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    saving.value = false
  }
}

async function toggleActive(u: ManagedUser) {
  await api.post(`/users/${u.id}/${u.isActive ? 'deactivate' : 'activate'}`)
  await load()
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-xl font-bold text-gray-900">إدارة المستخدمين</h1>

    <div class="mb-8 overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
      <table class="w-full min-w-[40rem] text-right text-sm">
        <thead class="bg-gray-50 text-gray-500">
          <tr>
            <th class="px-4 py-3 font-medium">الاسم</th>
            <th class="px-4 py-3 font-medium">البريد الإلكتروني</th>
            <th class="px-4 py-3 font-medium">الدور</th>
            <th class="px-4 py-3 font-medium">المصادقة الثنائية</th>
            <th class="px-4 py-3 font-medium">الحالة</th>
            <th class="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" class="border-t border-gray-100">
            <td class="px-4 py-3">{{ u.fullName }}</td>
            <td class="px-4 py-3">{{ u.email }}</td>
            <td class="px-4 py-3">{{ u.role === 'Manager' ? 'مدير' : 'محامٍ' }}</td>
            <td class="px-4 py-3">{{ u.totpEnabled ? 'مفعّلة' : 'غير مفعّلة' }}</td>
            <td class="px-4 py-3">{{ u.isActive ? 'نشط' : 'معطّل' }}</td>
            <td class="px-4 py-3">
              <button class="text-sm text-red-600 hover:underline" @click="toggleActive(u)">
                {{ u.isActive ? 'تعطيل' : 'تفعيل' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="max-w-lg rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 class="mb-4 text-base font-bold text-gray-900">إضافة مستخدم جديد</h2>
      <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>
      <form class="space-y-4" @submit.prevent="createUser">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">الاسم الكامل</label>
          <input v-model="form.fullName" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
          <input v-model="form.email" type="email" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">الدور</label>
          <select v-model="form.role" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="Lawyer">محامٍ</option>
            <option value="Manager">مدير</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">كلمة مرور مؤقتة</label>
          <input v-model="form.temporaryPassword" type="text" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <p class="mt-1 text-xs text-gray-400">
            12 محرفاً فأكثر، أحرف كبيرة وصغيرة ورقم ورمز. سيُطلب من المستخدم تغييرها عند أول دخول.
          </p>
        </div>
        <button
          type="submit"
          :disabled="saving"
          class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {{ saving ? '...جارٍ الإضافة' : 'إضافة' }}
        </button>
      </form>
    </div>
  </div>
</template>
