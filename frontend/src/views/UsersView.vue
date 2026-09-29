<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import type { ManagedUser, UserRole } from '@/api/types'

/** وصف الدورين كما اعتمدتهما الإدارة: الشريك الإداري بكل الصلاحيات، وبقية الفريق بصلاحيات العمل القانوني كاملة. */
const roleLabel: Record<UserRole, string> = {
  Manager: 'كل الصلاحيات (إدارة المستخدمين، الفوترة، التدقيق، الإعدادات)',
  Lawyer: 'العمل القانوني والقضائي كاملاً، والحفظ والأرشفة'
}

const emptyForm = () => ({
  fullName: '',
  email: '',
  role: 'Lawyer' as UserRole,
  title: '',
  isLicensedLawyer: false,
  licenseNumber: '',
  temporaryPassword: ''
})

const users = ref<ManagedUser[]>([])
const form = ref(emptyForm())
const editing = ref<{ id: string; fullName: string; role: UserRole; title: string; isLicensedLawyer: boolean; licenseNumber: string } | null>(null)
const error = ref('')
const info = ref('')
const saving = ref(false)

async function load() {
  const { data } = await api.get<ManagedUser[]>('/users')
  users.value = data
}

onMounted(load)

async function createUser() {
  error.value = ''
  info.value = ''
  saving.value = true
  try {
    await api.post('/users', { ...form.value, title: form.value.title || null, licenseNumber: form.value.licenseNumber || null })
    form.value = emptyForm()
    info.value = 'أُضيف المستخدم. يغيّر كلمة المرور ويفعّل المصادقة الثنائية عند أول دخول.'
    await load()
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    saving.value = false
  }
}

function startEdit(u: ManagedUser) {
  editing.value = { id: u.id, fullName: u.fullName, role: u.role, title: u.title || '', isLicensedLawyer: u.isLicensedLawyer, licenseNumber: u.licenseNumber || '' }
}

async function saveEdit() {
  const e = editing.value!
  error.value = ''
  info.value = ''
  try {
    await api.put(`/users/${e.id}/profile`, {
      fullName: e.fullName,
      role: e.role,
      title: e.title || null,
      isLicensedLawyer: e.isLicensedLawyer,
      licenseNumber: e.licenseNumber || null
    })
    editing.value = null
    info.value = 'حُفظت بيانات المستخدم'
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}

async function toggleActive(u: ManagedUser) {
  await api.post(`/users/${u.id}/${u.isActive ? 'deactivate' : 'activate'}`)
  await load()
}
</script>

<template>
  <div>
    <h1 class="mb-1 text-xl font-bold text-gray-900">إدارة المستخدمين</h1>
    <p class="mb-6 text-sm text-gray-500">
      الترافع في الجلسات يُسند للمحامين المرخّصين وحدهم (نظام المحاماة)، فحدّد صفة "محامٍ مرخّص" ورقم الرخصة لمن يحملها.
    </p>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="info" class="mb-4 rounded-lg border border-green-100 bg-green-50 p-3 text-sm text-green-700">{{ info }}</p>

    <div class="mb-8 overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
      <table class="w-full min-w-[52rem] text-right text-sm">
        <thead class="bg-gray-50 text-gray-500">
          <tr>
            <th class="px-4 py-3 font-medium">الاسم والصفة</th>
            <th class="px-4 py-3 font-medium">البريد الإلكتروني</th>
            <th class="px-4 py-3 font-medium">الصلاحيات</th>
            <th class="px-4 py-3 font-medium">الترخيص</th>
            <th class="px-4 py-3 font-medium">المصادقة الثنائية</th>
            <th class="px-4 py-3 font-medium">الحالة</th>
            <th class="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="u in users" :key="u.id">
            <tr class="border-t border-gray-100 align-top">
              <td class="px-4 py-3">{{ u.fullName }}<div class="text-xs text-gray-500">{{ u.title || '—' }}</div></td>
              <td class="px-4 py-3">{{ u.email }}</td>
              <td class="px-4 py-3 text-xs">{{ roleLabel[u.role] }}</td>
              <td class="px-4 py-3 text-xs">{{ u.isLicensedLawyer ? `محامٍ مرخّص (${u.licenseNumber})` : '—' }}</td>
              <td class="px-4 py-3">{{ u.totpEnabled ? 'مفعّلة' : 'غير مفعّلة' }}</td>
              <td class="px-4 py-3">{{ u.isActive ? 'نشط' : 'معطّل' }}</td>
              <td class="whitespace-nowrap px-4 py-3">
                <button class="me-3 text-sm text-brand-700 hover:underline" @click="startEdit(u)">تعديل</button>
                <button class="text-sm text-red-600 hover:underline" @click="toggleActive(u)">{{ u.isActive ? 'تعطيل' : 'تفعيل' }}</button>
              </td>
            </tr>
            <tr v-if="editing?.id === u.id" class="bg-cream">
              <td colspan="7" class="px-4 py-4">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <input v-model="editing.fullName" placeholder="الاسم" class="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input v-model="editing.title" placeholder="الصفة" class="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <select v-model="editing.role" class="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="Lawyer">{{ roleLabel.Lawyer }}</option>
                    <option value="Manager">{{ roleLabel.Manager }}</option>
                  </select>
                  <div class="flex items-center gap-2">
                    <label class="flex items-center gap-1 text-sm"><input v-model="editing.isLicensedLawyer" type="checkbox" /> مرخّص</label>
                    <input
                      v-if="editing.isLicensedLawyer"
                      v-model="editing.licenseNumber"
                      placeholder="رقم الرخصة"
                      class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div class="mt-3 flex gap-2">
                  <button class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white" @click="saveEdit">حفظ</button>
                  <button class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm" @click="editing = null">إلغاء</button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div class="max-w-lg rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 class="mb-4 text-base font-bold text-gray-900">إضافة مستخدم جديد</h2>
      <form class="space-y-4" @submit.prevent="createUser">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">الاسم الكامل</label>
          <input v-model="form.fullName" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">الصفة</label>
          <input v-model="form.title" placeholder="مثل: الشريك الاستشاري القانوني" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">البريد الإلكتروني (بريد الشركة)</label>
          <input v-model="form.email" type="email" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">الصلاحيات</label>
          <select v-model="form.role" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="Lawyer">{{ roleLabel.Lawyer }}</option>
            <option value="Manager">{{ roleLabel.Manager }}</option>
          </select>
        </div>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 text-sm"><input v-model="form.isLicensedLawyer" type="checkbox" /> محامٍ مرخّص</label>
          <input
            v-if="form.isLicensedLawyer"
            v-model="form.licenseNumber"
            required
            placeholder="رقم رخصة المحاماة"
            class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
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
