<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import type { ManagedUser } from '@/api/types'

const form = ref({
  firmName: '',
  vatNumber: '',
  commercialRegistrationNumber: '',
  address: '',
  phone: '',
  email: '',
  defaultVatRate: 0.15,
  onDutyUserId: null as string | null
})
const users = ref<ManagedUser[]>([])

const error = ref('')
const success = ref(false)
const saving = ref(false)

onMounted(async () => {
  const [{ data }, usersRes] = await Promise.all([api.get('/office-settings'), api.get<ManagedUser[]>('/users')])
  form.value = { ...form.value, ...data }
  users.value = usersRes.data.filter((u) => u.isActive)
})

async function save() {
  error.value = ''
  success.value = false
  saving.value = true
  try {
    await api.put('/office-settings', form.value)
    success.value = true
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-xl">
    <h1 class="mb-6 text-xl font-bold text-gray-900">إعدادات المكتب</h1>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="success" class="mb-4 rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">
      تم الحفظ بنجاح
    </p>

    <form class="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm" @submit.prevent="save">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">اسم المكتب</label>
        <input v-model="form.firmName" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">الرقم الضريبي</label>
          <input v-model="form.vatNumber" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">رقم السجل التجاري</label>
          <input v-model="form.commercialRegistrationNumber" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">العنوان</label>
        <input v-model="form.address" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">الجوال</label>
          <input v-model="form.phone" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
          <input v-model="form.email" type="email" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">نسبة الضريبة الافتراضية</label>
        <input v-model.number="form.defaultVatRate" type="number" step="0.01" min="0" max="1" class="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="on-duty">المحامي المناوب لطلبات الموقع</label>
        <select id="on-duty" v-model="form.onDutyUserId" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option :value="null">غير محدد — يُشعَر المديرون</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.fullName }}</option>
        </select>
        <p class="mt-1 text-xs text-gray-500">يصله إشعار بريدي برقم كل طلب جديد فقط، بلا بيانات مقدم الطلب.</p>
      </div>
      <div class="flex justify-end">
        <button
          type="submit"
          :disabled="saving"
          class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {{ saving ? '...جارٍ الحفظ' : 'حفظ' }}
        </button>
      </div>
    </form>
  </div>
</template>
