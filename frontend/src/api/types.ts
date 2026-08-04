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
