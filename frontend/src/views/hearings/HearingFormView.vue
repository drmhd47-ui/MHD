<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { apiErrorMessage } from '@/api/client'
import type { CaseItem, Hearing, TeamMember } from '@/api/types'
import { fromRiyadhInput, toRiyadhInput } from '@/utils/dates'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const route = useRoute()
const isEdit = !!props.id

const cases = ref<CaseItem[]>([])
const team = ref<TeamMember[]>([])
const form = ref({
  caseId: (route.query.caseId as string) || '',
  scheduledAt: '',
  court: '',
  circuit: '',
  location: '',
  purpose: '',
  lawyerId: '',
  supportUserId: ''
})
const error = ref('')
const saving = ref(false)

/** الترافع مقصور على المحامين المرخّصين (نظام المحاماة) — فلا يظهر في قائمة المترافع غيرهم. */
const licensed = computed(() => team.value.filter((m) => m.isLicensedLawyer))
const supportOptions = computed(() => team.value.filter((m) => m.id !== form.value.lawyerId))

onMounted(async () => {
  const [c, t] = await Promise.all([api.get<CaseItem[]>('/cases', { params: { status: 'Open' } }), api.get<TeamMember[]>('/team')])
  cases.value = c.data
  team.value = t.data
  if (isEdit) {
    const { data } = await api.get<Hearing>(`/hearings/${props.id}`)
    form.value = {
      caseId: data.caseId,
      scheduledAt: toRiyadhInput(data.scheduledAt),
      court: data.court || '',
      circuit: data.circuit || '',
      location: data.location || '',
      purpose: data.purpose || '',
      lawyerId: data.lawyerId,
      supportUserId: data.supportUserId || ''
    }
  } else if (licensed.value.length === 1) {
    form.value.lawyerId = licensed.value[0].id
  }
})

async function save() {
  error.value = ''
  saving.value = true
  try {
    const payload = {
      caseId: form.value.caseId,
      scheduledAt: fromRiyadhInput(form.value.scheduledAt),
      court: form.value.court || null,
      circuit: form.value.circuit || null,
      location: form.value.location || null,
      purpose: form.value.purpose || null,
      lawyerId: form.value.lawyerId,
      supportUserId: form.value.supportUserId || null
    }
    if (isEdit) await api.put(`/hearings/${props.id}`, payload)
    else await api.post('/hearings', payload)
    router.push('/hearings')
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="mb-6 text-xl font-bold text-gray-900">{{ isEdit ? 'تعديل جلسة' : 'جلسة جديدة' }}</h1>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="team.length && licensed.length === 0" class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      لا يوجد في النظام محامٍ مرخّص بعد. يحدّد الشريك الإداري صفة "محامٍ مرخّص" ورقم الرخصة من شاشة المستخدمين.
    </p>

    <form class="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm" @submit.prevent="save">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">الملف</label>
        <select v-model="form.caseId" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="" disabled>اختر الملف</option>
          <option v-for="c in cases" :key="c.id" :value="c.id">{{ c.caseNumber }} — {{ c.title }}</option>
        </select>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">موعد الجلسة (بتوقيت الرياض)</label>
          <input v-model="form.scheduledAt" type="datetime-local" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">الغرض من الجلسة</label>
          <input v-model="form.purpose" placeholder="مثل: تقديم مذكرة الرد" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">المحكمة</label>
          <input v-model="form.court" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">الدائرة</label>
          <input v-model="form.circuit" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">المكان</label>
          <input v-model="form.location" placeholder="حضوري / مرئي" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">المترافع (محامٍ مرخّص)</label>
          <select v-model="form.lawyerId" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="" disabled>اختر المحامي</option>
            <option v-for="m in licensed" :key="m.id" :value="m.id">{{ m.fullName }}{{ m.title ? ` — ${m.title}` : '' }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">العضو المساند (اختياري)</label>
          <select v-model="form.supportUserId" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">بلا</option>
            <option v-for="m in supportOptions" :key="m.id" :value="m.id">{{ m.fullName }}{{ m.title ? ` — ${m.title}` : '' }}</option>
          </select>
        </div>
      </div>
      <p class="text-xs text-gray-500">يصل المترافعَ والمساندَ تذكيرٌ قبل الجلسة بيوم، وتنبيهٌ إن مرّ يوم على الجلسة دون تسجيل تقريرها.</p>
      <div class="flex justify-end">
        <button type="submit" :disabled="saving" class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {{ saving ? '...جارٍ الحفظ' : 'حفظ' }}
        </button>
      </div>
    </form>
  </div>
</template>
