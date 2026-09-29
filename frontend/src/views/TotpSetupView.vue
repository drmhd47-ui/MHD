<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api, { apiErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

const secret = ref('')
const code = ref('')
const error = ref('')
const success = ref(false)
const loading = ref(false)

const auth = useAuthStore()
const router = useRouter()

onMounted(async () => {
  try {
    const { data } = await api.post('/auth/totp/setup')
    secret.value = data.secret
  } catch (e) {
    error.value = apiErrorMessage(e)
  }
})

async function confirm() {
  error.value = ''
  loading.value = true
  try {
    await api.post('/auth/totp/confirm', { code: code.value })
    auth.markTotpEnabled()
    success.value = true
    setTimeout(() => router.push('/'), 1200)
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
    <h2 class="mb-2 text-lg font-bold text-gray-900">تفعيل المصادقة الثنائية</h2>
    <p class="mb-4 text-sm text-gray-600">
      هذا الحساب يتطلب تفعيل المصادقة الثنائية إلزامياً. افتح تطبيق مصادقة (مثل Google Authenticator) وأضف مفتاحاً
      جديداً يدوياً بالقيمة التالية:
    </p>

    <div class="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
      <p class="break-all font-mono text-sm tracking-widest">{{ secret }}</p>
    </div>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="success" class="mb-4 rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">
      تم التفعيل بنجاح
    </p>

    <form v-if="!success" class="space-y-3" @submit.prevent="confirm">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">رمز التحقق من التطبيق</label>
        <input
          v-model="code"
          inputmode="numeric"
          maxlength="6"
          required
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-sm tracking-widest"
        />
      </div>
      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {{ loading ? '...جارٍ التحقق' : 'تأكيد وتفعيل' }}
      </button>
    </form>
  </div>
</template>
