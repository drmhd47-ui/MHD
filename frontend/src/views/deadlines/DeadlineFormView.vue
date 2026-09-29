<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { apiErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { CaseItem, DeadlineRule, LegalDeadline, TeamMember } from '@/api/types'
import { formatDateOnly, todayRiyadh } from '@/utils/dates'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const isEdit = !!props.id

const cases = ref<CaseItem[]>([])
const rules = ref<DeadlineRule[]>([])
const team = ref<TeamMember[]>([])
const existing = ref<LegalDeadline | null>(null)
const form = ref({
  caseId: (route.query.caseId as string) || '',
  ruleId: '' as string,
  title: '',
  days: null as number | null,
  legalBasis: '',
  triggerDate: todayRiyadh(),
  responsibleUserId: auth.user?.id ?? '',
  backupUserId: '',
  notes: ''
})
const preview = ref<{ dueDate: string; nominalDate: string; note?: string | null } | null>(null)
const error = ref('')
const saving = ref(false)

const rule = computed(() => rules.value.find((r) => r.id === form.value.ruleId) || null)
const custom = computed(() => !isEdit && form.value.ruleId === 'custom')
const effectiveDays = computed(() => {
  if (isEdit) return existing.value?.days ?? null
  if (custom.value) return form.value.days
  if (rule.value?.isInternal && form.value.days) return form.value.days
  return rule.value?.days ?? null
})

onMounted(async () => {
  const [c, r, t] = await Promise.all([
    api.get<CaseItem[]>('/cases'),
    api.get<DeadlineRule[]>('/deadline-rules'),
    api.get<TeamMember[]>('/team')
  ])
  cases.value = c.data.filter((x) => x.status !== 'Archived')
  rules.value = r.data
  team.value = t.data
  if (isEdit) {
    const { data } = await api.get<LegalDeadline>(`/deadlines/${props.id}`)
    existing.value = data
    form.value.caseId = data.caseId
    form.value.triggerDate = data.triggerDate
    form.value.responsibleUserId = data.responsibleUserId
    form.value.backupUserId = data.backupUserId
    form.value.notes = data.notes || ''
  }
})

/** معاينة تاريخ الانتهاء من الخادم (بالعطل المسجلة) قبل الحفظ. */
watch(
  () => [form.value.triggerDate, effectiveDays.value],
  async () => {
    preview.value = null
    if (!form.value.triggerDate || !effectiveDays.value) return
    try {
      const { data } = await api.get('/deadlines/preview', { params: { triggerDate: form.value.triggerDate, days: effectiveDays.value } })
      preview.value = data
    } catch {
      preview.value = null
    }
  }
)

async function save() {
  error.value = ''
  saving.value = true
  try {
    if (isEdit) {
      await api.put(`/deadlines/${props.id}`, {
        triggerDate: form.value.triggerDate,
        responsibleUserId: form.value.responsibleUserId,
        backupUserId: form.value.backupUserId,
        notes: form.value.notes || null
      })
    } else {
      await api.post('/deadlines', {
        caseId: form.value.caseId,
        ruleId: custom.value ? null : form.value.ruleId,
        title: form.value.title || null,
        days: custom.value || rule.value?.isInternal ? form.value.days : null,
        legalBasis: custom.value ? form.value.legalBasis || null : null,
        triggerDate: form.value.triggerDate,
        responsibleUserId: form.value.responsibleUserId,
        backupUserId: form.value.backupUserId,
        notes: form.value.notes || null
      })
    }
    router.push('/deadlines')
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="mb-6 text-xl font-bold text-gray-900">{{ isEdit ? 'تعديل مهلة' : 'مهلة جديدة' }}</h1>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

    <form class="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm" @submit.prevent="save">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">الملف</label>
        <select v-model="form.caseId" required :disabled="isEdit" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="" disabled>اختر الملف</option>
          <option v-for="c in cases" :key="c.id" :value="c.id">{{ c.caseNumber }} — {{ c.title }}</option>
        </select>
      </div>

      <template v-if="!isEdit">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">نوع المهلة</label>
          <select v-model="form.ruleId" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="" disabled>اختر القاعدة</option>
            <option v-for="r in rules" :key="r.id" :value="r.id">{{ r.name }} — {{ r.days }} يوماً</option>
            <option value="custom">مهلة مخصصة…</option>
          </select>
          <div v-if="rule" class="mt-2 rounded-lg bg-gray-50 p-3 text-xs leading-6 text-gray-600">
            <div>تبدأ: {{ rule.trigger }}</div>
            <div v-if="!rule.isInternal">
              السند: {{ rule.legalBasis }}
              <span v-if="rule.basisVerified" class="text-green-700">— طابقه محامٍ مرخّص</span>
              <span v-else class="font-medium text-amber-800">— لم يطابقه محامٍ بعد مع النص الرسمي؛ تحقّق منه قبل الاعتماد</span>
            </div>
          </div>
        </div>
        <div v-if="custom || rule?.isInternal" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="sm:col-span-2">
            <label class="mb-1 block text-sm font-medium text-gray-700">عنوان المهلة</label>
            <input v-model="form.title" :required="custom" :placeholder="rule?.name" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">عدد الأيام</label>
            <input v-model.number="form.days" type="number" min="1" max="365" :required="custom" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div v-if="custom">
          <label class="mb-1 block text-sm font-medium text-gray-700">السند النظامي (فارغ = مهلة داخلية)</label>
          <input v-model="form.legalBasis" placeholder="اسم النظام — رقم المادة" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </template>
      <p v-else-if="existing" class="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
        {{ existing.title }} — {{ existing.days }} يوماً. تغيير تاريخ البدء يعيد الحساب ويُسقط التحقق المزدوج ليُعاد.
      </p>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">تاريخ واقعة البدء (التسلّم أو التبليغ)</label>
        <input v-model="form.triggerDate" type="date" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <p class="mt-1 text-xs text-gray-500">لا يُحسب يوم الواقعة، وإن صادف آخر يوم عطلةً امتد إلى أول يوم عمل بعدها.</p>
      </div>

      <div v-if="preview" class="rounded-lg border border-gold bg-cream p-3 text-sm">
        <span class="text-gray-600">تاريخ الانتهاء المحسوب:</span>
        <strong class="ms-1 text-brand-700">{{ formatDateOnly(preview.dueDate) }}</strong>
        <p v-if="preview.note" class="mt-1 text-xs text-amber-800">{{ preview.note }}</p>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">المسؤول</label>
          <select v-model="form.responsibleUserId" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option v-for="m in team" :key="m.id" :value="m.id">{{ m.fullName }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">النائب (شخص آخر)</label>
          <select v-model="form.backupUserId" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="" disabled>اختر النائب</option>
            <option v-for="m in team.filter((x) => x.id !== form.responsibleUserId)" :key="m.id" :value="m.id">{{ m.fullName }}</option>
          </select>
        </div>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">ملاحظات</label>
        <textarea v-model="form.notes" rows="2" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"></textarea>
      </div>
      <p class="text-xs text-gray-500">بعد الحفظ يتحقق مستخدم آخر من التاريخ بحسابه المستقل، ولا تُعد المهلة معتمدة قبل ذلك.</p>
      <div class="flex justify-end">
        <button type="submit" :disabled="saving" class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {{ saving ? '...جارٍ الحفظ' : 'حفظ' }}
        </button>
      </div>
    </form>
  </div>
</template>
