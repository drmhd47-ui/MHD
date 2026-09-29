<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api, { apiErrorMessage } from '@/api/client'
import type { ClientType, IntakeRequestDetail } from '@/api/types'
import { conflictLabels, statusClasses, statusLabels } from './labels'

const props = defineProps<{ id: string }>()
const router = useRouter()

const item = ref<IntakeRequestDetail | null>(null)
const error = ref('')
const busy = ref(false)

const clientType = ref<ClientType>('Individual')
const acknowledge = ref(false)
const conflictNote = ref('')
const declineReason = ref('')

const isOpen = computed(() => item.value?.status === 'New' || item.value?.status === 'InReview')
const blocking = computed(() => item.value?.conflicts.filter((c) => c.blocking) ?? [])
const fmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { dateStyle: 'medium', timeStyle: 'short' })

async function load() {
  const { data } = await api.get<IntakeRequestDetail>(`/intake-requests/${props.id}`)
  item.value = data
}

onMounted(load)

async function run(action: () => Promise<void>) {
  error.value = ''
  busy.value = true
  try {
    await action()
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    busy.value = false
  }
}

const take = () =>
  run(async () => {
    await api.post(`/intake-requests/${props.id}/take`)
    await load()
  })

const convert = () =>
  run(async () => {
    const { data } = await api.post<{ clientId: string }>(`/intake-requests/${props.id}/convert`, {
      type: clientType.value,
      acknowledgeConflicts: acknowledge.value,
      conflictNote: conflictNote.value || null
    })
    router.push(`/clients/${data.clientId}`)
  })

const decline = () =>
  run(async () => {
    await api.post(`/intake-requests/${props.id}/decline`, { reason: declineReason.value })
    await load()
  })
</script>

<template>
  <div v-if="item" class="max-w-3xl">
    <router-link to="/intake-requests" class="text-sm text-brand-700 hover:underline">طلبات الموقع</router-link>
    <div class="mb-6 mt-2 flex flex-wrap items-center gap-3">
      <h1 class="text-xl font-bold text-gray-900">
        طلب رقم <span dir="ltr">{{ item.reference }}</span>
      </h1>
      <span class="rounded-full px-2.5 py-0.5 text-xs font-bold" :class="statusClasses[item.status]">{{ statusLabels[item.status] }}</span>
    </div>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

    <section class="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 class="mb-4 font-bold text-gray-900">بيانات الطلب</h2>
      <dl class="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div><dt class="text-gray-500">الاسم</dt><dd class="font-medium">{{ item.fullName }}</dd></div>
        <div><dt class="text-gray-500">الخدمة</dt><dd>{{ item.serviceTitle ?? 'غير محدد' }}</dd></div>
        <div>
          <dt class="text-gray-500">الجوال</dt>
          <dd dir="ltr" class="text-right">{{ item.phone ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-gray-500">البريد الإلكتروني</dt>
          <dd dir="ltr" class="text-right">{{ item.email ?? '—' }}</dd>
        </div>
        <div><dt class="text-gray-500">وسيلة التواصل المفضلة</dt><dd>{{ item.preferredContact === 'Email' ? 'البريد الإلكتروني' : 'الهاتف' }}</dd></div>
        <div><dt class="text-gray-500">الطرف الآخر المذكور</dt><dd>{{ item.opposingPartyName ?? '—' }}</dd></div>
        <div><dt class="text-gray-500">تاريخ الورود</dt><dd>{{ fmt.format(new Date(item.submittedAt)) }}</dd></div>
        <div><dt class="text-gray-500">لغة الموقع</dt><dd>{{ item.language === 'en' ? 'الإنجليزية' : 'العربية' }}</dd></div>
        <div>
          <dt class="text-gray-500">الموافقة على سياسة الخصوصية</dt>
          <dd>{{ fmt.format(new Date(item.consentAt)) }} — إصدار {{ item.privacyPolicyVersion }}</dd>
        </div>
        <div><dt class="text-gray-500">المسؤول</dt><dd>{{ item.assignedUserName ?? '—' }}</dd></div>
      </dl>
      <p v-if="item.anonymizedAt" class="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
        جُهِّلت البيانات الشخصية لهذا الطلب بعد انتهاء مدة الاحتفاظ وفق سياسة الخصوصية.
      </p>
    </section>

    <section class="mb-6 rounded-xl border bg-white p-6 shadow-sm" :class="blocking.length ? 'border-gold' : 'border-gray-100'">
      <h2 class="mb-2 font-bold text-gray-900">فحص تعارض المصالح</h2>
      <p v-if="item.conflicts.length === 0" class="text-sm text-gray-600">
        لا يوجد تطابق مع العملاء الحاليين أو الأطراف المقابلة في القضايا القائمة.
      </p>
      <ul v-else class="space-y-2 text-sm">
        <li
          v-for="(c, i) in item.conflicts"
          :key="i"
          class="rounded-lg border p-3"
          :class="c.blocking ? 'border-gold bg-brand-50' : 'border-gray-100'"
        >
          <p class="font-bold" :class="c.blocking ? 'text-brand-700' : 'text-gray-700'">
            {{ c.blocking ? 'تعارض محتمل: ' : '' }}{{ conflictLabels[c.kind] }}
          </p>
          <p class="text-gray-600">{{ c.name }} — {{ c.detail }}</p>
        </li>
      </ul>
      <p v-if="item.conflictAcknowledgement" class="mt-3 text-sm text-gray-700">
        <span class="font-bold">مبرر التحويل رغم التطابق:</span> {{ item.conflictAcknowledgement }}
      </p>
    </section>

    <section v-if="isOpen" class="space-y-6">
      <div v-if="item.status === 'New'" class="flex justify-end">
        <button
          type="button"
          :disabled="busy"
          class="rounded-lg border border-brand-600 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          @click="take"
        >
          استلام الطلب للمراجعة
        </button>
      </div>

      <form class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm" @submit.prevent="convert">
        <h2 class="mb-4 font-bold text-gray-900">تحويل إلى عميل</h2>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="client-type">نوع العميل</label>
        <select id="client-type" v-model="clientType" class="mb-4 w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="Individual">فرد</option>
          <option value="Company">منشأة</option>
        </select>

        <div v-if="blocking.length" class="mb-4 space-y-3 rounded-lg border border-gold bg-brand-50 p-4">
          <label class="flex items-start gap-2 text-sm">
            <input v-model="acknowledge" type="checkbox" class="mt-1" />
            <span>راجعتُ نتائج فحص التعارض أعلاه وأقرّ بأن التطابق لا يمنع قبول الطلب.</span>
          </label>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700" for="conflict-note">المبرر (يُحفظ في سجل التدقيق)</label>
            <textarea id="conflict-note" v-model="conflictNote" rows="2" maxlength="500" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"></textarea>
          </div>
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="busy || (blocking.length > 0 && (!acknowledge || !conflictNote.trim()))"
            class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            تحويل وإنشاء ملف العميل
          </button>
        </div>
      </form>

      <form class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm" @submit.prevent="decline">
        <h2 class="mb-4 font-bold text-gray-900">الاعتذار عن الطلب</h2>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="decline-reason">السبب (داخلي، لا يُرسل للعميل)</label>
        <textarea id="decline-reason" v-model="declineReason" rows="2" maxlength="500" required class="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"></textarea>
        <p class="mb-4 text-xs text-gray-500">تُجهَّل البيانات الشخصية للطلب المعتذر عنه تلقائياً بعد انتهاء مدة الاحتفاظ.</p>
        <div class="flex justify-end">
          <button type="submit" :disabled="busy || !declineReason.trim()" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            تأكيد الاعتذار
          </button>
        </div>
      </form>
    </section>

    <p v-else-if="item.status === 'Declined'" class="text-sm text-gray-600">سبب الاعتذار: {{ item.declineReason }}</p>
    <p v-else-if="item.convertedClientId" class="text-sm">
      <router-link :to="`/clients/${item.convertedClientId}`" class="font-medium text-brand-700 hover:underline">فتح ملف العميل</router-link>
    </p>
  </div>
</template>
