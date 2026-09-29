import type { DeadlineStatus, HearingStatus } from '@/api/types'

export const hearingStatusLabel: Record<HearingStatus, string> = {
  Scheduled: 'مجدولة',
  Held: 'انعقدت',
  Postponed: 'أُجّلت',
  Cancelled: 'أُلغيت'
}

export const deadlineStatusLabel: Record<DeadlineStatus, string> = {
  Open: 'مفتوحة',
  Completed: 'أُنجزت',
  Waived: 'تُنوزل عنها'
}
