<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api, { apiErrorMessage } from '@/api/client'
import type { Client, CaseItem, TimeEntry, Invoice, VatStatus } from '@/api/types'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const isEdit = !!props.id

const clients = ref<Client[]>([])
const cases = ref<CaseItem[]>([])
const unbilledEntries = ref<TimeEntry[]>([])
const selectedEntryIds = ref<string[]>([])
const hourlyRate = ref(0)

const invoice = ref<Invoice | null>(null)
const form = ref({
  clientId: '',
  caseId: '',
  issueDate: new Date().toISOString().slice(0, 10),
  vatRate: 0.15,
  lines: [{ description: '', quantity: 1, unitPrice: 0 }]
})

const error = ref('')
const saving = ref(false)
/** وضع الضريبة من إعدادات المكتب: غير المسجَّل لا يحتسب ضريبة (الخادم يفرض ذلك أيضاً). */
const vatRegistered = ref(false)

const statusLabel: Record<string, string> = { Draft: 'مسودة', Issued: 'صادرة', Paid: 'مدفوعة', Cancelled: 'ملغاة' }
const canEditFinancials = computed(() => !invoice.value || invoice.value.status === 'Draft')

onMounted(async () => {
  const [clientsRes, casesRes, vatRes] = await Promise.all([
    api.get<Client[]>('/clients'),
    api.get<CaseItem[]>('/cases'),
    api.get<VatStatus>('/invoices/vat-status')
  ])
  clients.value = clientsRes.data
  cases.value = casesRes.data
  vatRegistered.value = vatRes.data.isVatRegistered
  if (!vatRegistered.value) form.value.vatRate = 0

  if (isEdit) {
    const { data } = await api.get<Invoice>(`/invoices/${props.id}`)
    invoice.value = data
    form.value = {
      clientId: data.clientId,
      caseId: data.caseId || '',
      issueDate: data.issueDate,
      vatRate: data.vatRate,
      lines: data.lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice }))
    }
  }
})

async function loadUnbilled() {
  if (!form.value.caseId) {
    unbilledEntries.value = []
    return
  }
  const { data } = await api.get<TimeEntry[]>('/time-entries', { params: { caseId: form.value.caseId, billed: false } })
  unbilledEntries.value = data
}

function addLine() {
  form.value.lines.push({ description: '', quantity: 1, unitPrice: 0 })
}
function removeLine(i: number) {
  form.value.lines.splice(i, 1)
}

async function save() {
  error.value = ''
  saving.value = true
  try {
    const payload: Record<string, unknown> = {
      clientId: form.value.clientId,
      caseId: form.value.caseId || null,
      issueDate: form.value.issueDate,
      vatRate: form.value.vatRate,
      lines: form.value.lines.filter((l) => l.description && l.quantity > 0)
    }
    if (!isEdit && selectedEntryIds.value.length > 0) {
      payload.timeEntryIds = selectedEntryIds.value
      payload.hourlyRate = hourlyRate.value
    }

    if (isEdit) {
      const { data } = await api.put(`/invoices/${props.id}`, payload)
      invoice.value = data
    } else {
      const { data } = await api.post('/invoices', payload)
      router.push(`/invoices/${data.id}`)
      return
    }
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    saving.value = false
  }
}

async function issue() {
  if (!invoice.value) return
  try {
    const { data } = await api.post(`/invoices/${invoice.value.id}/issue`)
    invoice.value = data
  } catch (e) {
    error.value = apiErrorMessage(e)
  }
}

async function markPaid() {
  if (!invoice.value) return
  const amount = window.prompt('المبلغ المدفوع؟', String(invoice.value.total))
  if (!amount) return
  try {
    const { data } = await api.post(`/invoices/${invoice.value.id}/mark-paid`, { paidAmount: Number(amount) })
    invoice.value = data
  } catch (e) {
    error.value = apiErrorMessage(e)
  }
}

async function cancelInvoice() {
  if (!invoice.value) return
  try {
    const { data } = await api.post(`/invoices/${invoice.value.id}/cancel`)
    invoice.value = data
  } catch (e) {
    error.value = apiErrorMessage(e)
  }
}
</script>

<template>
  <div class="max-w-3xl">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-bold text-gray-900">{{ isEdit ? 'فاتورة' : 'فاتورة جديدة' }}</h1>
      <span v-if="invoice" class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
        {{ statusLabel[invoice.status] }}
      </span>
    </div>

    <p v-if="error" class="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

    <div v-if="invoice" class="mb-4 flex flex-wrap gap-2">
      <button v-if="invoice.status === 'Draft'" class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700" @click="issue">
        إصدار الفاتورة
      </button>
      <button v-if="invoice.status === 'Issued'" class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700" @click="markPaid">
        تسجيل الدفع
      </button>
      <button v-if="invoice.status === 'Draft' || invoice.status === 'Issued'" class="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50" @click="cancelInvoice">
        إلغاء
      </button>
    </div>

    <div v-if="invoice?.invoiceNumber" class="mb-4 rounded-xl border border-gray-100 bg-white p-4 text-sm shadow-sm">
      <p><span class="text-gray-500">رقم الفاتورة:</span> <span class="font-medium">{{ invoice.invoiceNumber }}</span></p>
      <p class="mt-1"><span class="text-gray-500">النوع:</span> {{ invoice.isTaxInvoice ? 'فاتورة ضريبية' : 'فاتورة (البائع غير مسجّل في ضريبة القيمة المضافة)' }}</p>
      <p class="mt-1">
        <span class="text-gray-500">البائع:</span> {{ invoice.sellerName }}<template v-if="invoice.sellerVatNumber"> — الرقم الضريبي {{ invoice.sellerVatNumber }}</template>
      </p>
      <p v-if="invoice.qrCodeTlvBase64" class="mt-1 break-all text-xs text-gray-400">
        رمز QR (TLV مُرمَّز base64): {{ invoice.qrCodeTlvBase64 }}
      </p>
    </div>

    <form class="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm" @submit.prevent="save">
      <fieldset :disabled="!canEditFinancials" class="space-y-4 disabled:opacity-60">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">العميل</label>
            <select v-model="form.clientId" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="" disabled>اختر عميلاً</option>
              <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.fullName }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">القضية (اختياري)</label>
            <select v-model="form.caseId" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" @change="loadUnbilled">
              <option value="">بلا قضية مرتبطة</option>
              <option v-for="c in cases" :key="c.id" :value="c.id">{{ c.caseNumber }} — {{ c.title }}</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">تاريخ الإصدار</label>
            <input v-model="form.issueDate" type="date" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div v-if="vatRegistered">
            <label class="mb-1 block text-sm font-medium text-gray-700">نسبة الضريبة</label>
            <input v-model.number="form.vatRate" type="number" step="0.01" min="0" max="1" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <p v-else class="self-end text-xs text-gray-500">الشركة غير مسجّلة في ضريبة القيمة المضافة — لا تُحتسب ضريبة.</p>
        </div>

        <div v-if="!isEdit && form.caseId && unbilledEntries.length > 0" class="rounded-lg border border-gray-200 p-3">
          <p class="mb-2 text-sm font-medium text-gray-700">ساعات عمل غير مُفوترة لهذه القضية</p>
          <div class="mb-2 flex items-center gap-2">
            <label class="text-sm text-gray-600">سعر الساعة:</label>
            <input v-model.number="hourlyRate" type="number" min="0" class="w-32 rounded-lg border border-gray-300 px-2 py-1 text-sm" />
          </div>
          <label v-for="e in unbilledEntries" :key="e.id" class="flex items-center gap-2 py-1 text-sm">
            <input type="checkbox" :value="e.id" v-model="selectedEntryIds" />
            {{ e.workDate }} — {{ e.hours }} ساعة — {{ e.description }}
          </label>
        </div>

        <div>
          <div class="mb-2 flex items-center justify-between">
            <label class="block text-sm font-medium text-gray-700">بنود الفاتورة</label>
            <button type="button" class="text-sm text-brand-700 hover:underline" @click="addLine">إضافة بند</button>
          </div>
          <div v-for="(line, i) in form.lines" :key="i" class="mb-2 grid grid-cols-12 gap-2">
            <input v-model="line.description" placeholder="الوصف" class="col-span-6 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
            <input v-model.number="line.quantity" type="number" step="0.01" min="0" placeholder="الكمية" class="col-span-2 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
            <input v-model.number="line.unitPrice" type="number" step="0.01" min="0" placeholder="سعر الوحدة" class="col-span-3 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
            <button type="button" class="col-span-1 text-red-600 hover:underline" @click="removeLine(i)">حذف</button>
          </div>
        </div>
      </fieldset>

      <div v-if="invoice" class="rounded-lg bg-gray-50 p-3 text-sm">
        <p>المجموع الفرعي: {{ invoice.subtotal.toFixed(2) }}</p>
        <p v-if="invoice.isTaxInvoice || invoice.vatAmount > 0">الضريبة: {{ invoice.vatAmount.toFixed(2) }}</p>
        <p class="font-bold">الإجمالي: {{ invoice.total.toFixed(2) }}</p>
      </div>

      <div v-if="canEditFinancials" class="flex justify-end gap-2">
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
