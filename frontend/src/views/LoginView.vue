<script setup lang="ts">
import logo from '@/assets/logo-mark.svg'
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiErrorMessage } from '@/api/client'

const email = ref('')
const password = ref('')
const newPassword = ref('')
const newPasswordConfirm = ref('')
const totpCode = ref('')
const error = ref('')
const loading = ref(false)

const step = ref<'credentials' | 'change_password' | 'totp'>('credentials')
const pendingToken = ref('')

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

function redirectAfterLogin() {
  const redirect = (route.query.redirect as string) || '/'
  router.push(redirect)
}

async function submitCredentials() {
  error.value = ''
  loading.value = true
  try {
    const result = await auth.login(email.value, password.value)
    if (result.status === 'must_change_password' && result.token) {
      pendingToken.value = result.token
      step.value = 'change_password'
    } else if (result.status === 'totp_required' && result.token) {
      pendingToken.value = result.token
      step.value = 'totp'
    } else if (result.status === 'ok') {
      auth.applySession(result)
      redirectAfterLogin()
    }
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    loading.value = false
  }
}

async function submitChangePassword() {
  error.value = ''
  if (newPassword.value !== newPasswordConfirm.value) {
    error.value = 'كلمتا المرور غير متطابقتين'
    return
  }
  loading.value = true
  try {
    const result = await auth.changePassword(pendingToken.value, newPassword.value)
    if (result.status === 'totp_required' && result.token) {
      pendingToken.value = result.token
      step.value = 'totp'
    } else if (result.status === 'ok') {
      redirectAfterLogin()
    }
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    loading.value = false
  }
}

async function submitTotp() {
  error.value = ''
  loading.value = true
  try {
    const result = await auth.verifyTotp(pendingToken.value, totpCode.value)
    if (result.status === 'ok') {
      redirectAfterLogin()
    }
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50" dir="rtl">
    <div class="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
      <div class="mb-6 flex items-center gap-3">
        <span class="rounded-lg border border-gold bg-cream p-1.5">
          <img :src="logo" alt="" class="h-16 w-auto" />
        </span>
        <div>
          <h1 class="text-xl font-bold text-brand-700">مجموعة إم القانونية</h1>
          <p class="text-sm text-gray-500">النظام الداخلي لإدارة المكتب</p>
        </div>
      </div>

      <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

      <form v-if="step === 'credentials'" class="space-y-4" @submit.prevent="submitCredentials">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">كلمة المرور</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {{ loading ? '...جارٍ الدخول' : 'تسجيل الدخول' }}
        </button>
      </form>

      <form v-else-if="step === 'change_password'" class="space-y-4" @submit.prevent="submitChangePassword">
        <p class="text-sm text-gray-600">
          يجب تعيين كلمة مرور جديدة قبل المتابعة (12 محرفاً فأكثر، حروف كبيرة وصغيرة ورقم ورمز).
        </p>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">كلمة المرور الجديدة</label>
          <input v-model="newPassword" type="password" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">تأكيد كلمة المرور</label>
          <input v-model="newPasswordConfirm" type="password" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {{ loading ? '...جارٍ الحفظ' : 'حفظ ومتابعة' }}
        </button>
      </form>

      <form v-else-if="step === 'totp'" class="space-y-4" @submit.prevent="submitTotp">
        <p class="text-sm text-gray-600">أدخل رمز التحقق من تطبيق المصادقة الثنائية.</p>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">رمز التحقق</label>
          <input
            v-model="totpCode"
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
          {{ loading ? '...جارٍ التحقق' : 'تحقق' }}
        </button>
      </form>
    </div>
  </div>
</template>
