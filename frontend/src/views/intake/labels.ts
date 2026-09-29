import type { IntakeConflict, IntakeRequestStatus } from '@/api/types'

export const statusLabels: Record<IntakeRequestStatus, string> = {
  New: 'جديد',
  InReview: 'قيد المراجعة',
  Converted: 'حُوِّل إلى عميل',
  Declined: 'اعتُذر عنه'
}

export const statusClasses: Record<IntakeRequestStatus, string> = {
  New: 'bg-gold text-brand-700',
  InReview: 'bg-brand-100 text-brand-700',
  Converted: 'bg-brand-600 text-white',
  Declined: 'bg-gray-100 text-gray-600'
}

export const conflictLabels: Record<IntakeConflict['kind'], string> = {
  ApplicantIsOpposingParty: 'مقدم الطلب طرف مقابل في قضية قائمة لدى المكتب',
  ApplicantIsExistingClient: 'مقدم الطلب عميل حالي للمكتب (للعلم)',
  OtherPartyIsClient: 'الطرف الآخر الذي ذكره عميل حالي للمكتب',
  OtherPartyIsOpposingParty: 'الطرف الآخر مذكور طرفاً مقابلاً في قضية قائمة (للعلم)'
}
