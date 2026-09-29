export type UserRole = 'Manager' | 'Lawyer'

export interface AuthUser {
  id: string
  fullName: string
  email: string
  role: UserRole
  totpEnabled: boolean
}

export type ClientType = 'Individual' | 'Company'

export interface Client {
  id: string
  type: ClientType
  fullName: string
  nationalIdOrCr?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  isArchived: boolean
  createdAt: string
}

export type CaseStatus = 'Open' | 'Closed' | 'Archived'

export interface CaseItem {
  id: string
  caseNumber: string
  title: string
  clientId: string
  client?: Client
  opposingPartyName?: string | null
  caseType?: string | null
  court?: string | null
  status: CaseStatus
  openedDate: string
  closedDate?: string | null
  assignedLawyerId: string
  description?: string | null
  createdAt: string
}

export interface ConflictMatch {
  id: string
  fullName: string
  reason: string
}

export interface ManagedUser {
  id: string
  fullName: string
  email: string
  role: UserRole
  isActive: boolean
  totpEnabled: boolean
  lastLoginAt?: string | null
  createdAt: string
}

export interface AuditEntry {
  id: number
  userName: string
  action: string
  entityType: string
  entityId?: string | null
  ipAddress: string
  timestamp: string
}

export interface DocumentMeta {
  id: string
  fileName: string
  contentType: string
  sizeBytes: number
  isArchived: boolean
  uploadedAt: string
}

export type AppointmentType = 'Hearing' | 'Meeting' | 'Deadline' | 'Other'

export interface Appointment {
  id: string
  title: string
  type: AppointmentType
  caseId?: string | null
  case?: CaseItem | null
  startAt: string
  endAt?: string | null
  location?: string | null
  notes?: string | null
  reminderMinutesBefore?: number | null
  assignedUserId: string
  assignedUser?: AuthUser | null
  isCancelled: boolean
  createdAt: string
}

export type LegalReferenceType = 'Law' | 'Regulation' | 'Decision' | 'Circular' | 'Other'

export interface LegalReference {
  id: string
  title: string
  type: LegalReferenceType
  issuingAuthority?: string | null
  issueDate?: string | null
  referenceNumber?: string | null
  summary?: string | null
  sourceUrl?: string | null
  createdAt: string
}

export interface TimeEntry {
  id: string
  caseId: string
  case?: CaseItem | null
  lawyerId: string
  lawyer?: AuthUser | null
  workDate: string
  hours: number
  description: string
  isBilled: boolean
  createdAt: string
}

export type InvoiceStatus = 'Draft' | 'Issued' | 'Paid' | 'Cancelled'

export interface InvoiceLine {
  id: string
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface Invoice {
  id: string
  invoiceNumber?: string | null
  clientId: string
  client?: Client | null
  caseId?: string | null
  case?: CaseItem | null
  status: InvoiceStatus
  issueDate: string
  subtotal: number
  vatRate: number
  vatAmount: number
  total: number
  sellerName?: string | null
  sellerVatNumber?: string | null
  qrCodeTlvBase64?: string | null
  paidAt?: string | null
  paidAmount?: number | null
  createdAt: string
  lines: InvoiceLine[]
}

export interface OfficeSettingsData {
  id: string
  firmName: string
  vatNumber?: string | null
  commercialRegistrationNumber?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  defaultVatRate: number
  onDutyUserId?: string | null
  updatedAt: string
}

export type IntakeRequestStatus = 'New' | 'InReview' | 'Converted' | 'Declined'
export type PreferredContact = 'Phone' | 'Email'

export interface IntakeRequestListItem {
  id: string
  reference: string
  submittedAt: string
  fullName: string
  serviceTitle?: string | null
  preferredContact: PreferredContact
  status: IntakeRequestStatus
  assignedUserName?: string | null
}

export interface IntakeConflict {
  kind: 'ApplicantIsOpposingParty' | 'ApplicantIsExistingClient' | 'OtherPartyIsClient' | 'OtherPartyIsOpposingParty'
  blocking: boolean
  name: string
  detail: string
}

export interface IntakeRequestDetail extends IntakeRequestListItem {
  receivedAt: string
  language: 'ar' | 'en'
  phone?: string | null
  email?: string | null
  serviceSlug?: string | null
  opposingPartyName?: string | null
  consentAt: string
  privacyPolicyVersion: string
  convertedClientId?: string | null
  declineReason?: string | null
  conflictAcknowledgement?: string | null
  closedAt?: string | null
  anonymizedAt?: string | null
  conflicts: IntakeConflict[]
  hasBlockingConflict: boolean
}
