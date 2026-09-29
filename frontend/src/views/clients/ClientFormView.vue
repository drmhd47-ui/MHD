<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api, { apiErrorMessage } from '@/api/client'
import type { ClientType, ConflictMatch } from '@/api/types'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const isEdit = !!props.id

const form = ref({
  type: 'Individual' as ClientType,
  fullName: '',
  nationalIdOrCr: '',
  phone: '',
  email: '',
  address: '',
  notes: ''
})

const error = ref('')
const saving = ref(false)
const conflictMatches = ref<ConflictMatch[]>([])

onMounted(async () => {
  if (isEdit) {
    const { data } = await api.get(`/clients/${props.id}`)
    form.value = { ...form.value, ...data }
  }
})

let debounce: ReturnType<typeof setTimeout>
watch(
  () => form.value.fullName,
  (name) => {
    clearTimeout(debounce)
    if (isEdit || !name || name.trim().length < 3) {
      conflictMatches.value = []
      return
    }
    debounce = setTimeout(async () => {
      const { data } = await api.get('/clients/conflict-check', { params: { q: name } })
      conflictMatches.value = data.matches
    }, 400)
  }
)

async function save() {
  error.value = ''
  saving.value = true
  try {
    if (isEdit) {
      await api.put(`/clients/${props.id}`, form.value)
    } else {
      await api.post('/clients', form.value)
    }
    router.push('/clients')
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="mb-6 text-xl font-bold text-gray-900">{{ isEdit ? 'تعديل بيانات عميل' : 'عميل جديد' }}</h1>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

    <div v-if="conflictMatches.length" class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <p class="mb-1 font-medium">تنبيه تعارض مصالح محتمل:</p>
      <ul class="list-inside list-disc space-y-0.5">
        <li v-for="m in conflictMatches" :key="m.id">{{ m.fullName }} — {{ m.reason }}</li>
      </ul>
    </div>

    <form class="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm" @submit.prevent="save">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">النوع</label>
          <select v-model="form.type" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="Individual">فرد</option>
            <option value="Company">شركة</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">رقم الهوية / السجل التجاري</label>
          <input v-model="form.nationalIdOrCr" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">الاسم الكامل</label>
        <input v-model="form.fullName" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
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
        <label class="mb-1 block text-sm font-medium text-gray-700">العنوان</label>
        <input v-model="form.address" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">ملاحظات</label>
        <textarea v-model="form.notes" rows="3" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"></textarea>
      </div>
      <div class="flex justify-end gap-2">
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
