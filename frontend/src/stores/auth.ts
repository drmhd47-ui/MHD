import { defineStore } from 'pinia'
import api from '@/api/client'
import type { AuthUser } from '@/api/types'

interface SessionResult {
  status: 'ok' | 'must_change_password' | 'totp_required'
  token?: string
  accessToken?: string
  refreshToken?: string
  user?: AuthUser
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: localStorage.getItem('mhd_access_token') as string | null,
    refreshToken: localStorage.getItem('mhd_refresh_token') as string | null,
    user: JSON.parse(localStorage.getItem('mhd_user') ?? 'null') as AuthUser | null
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken && !!state.user,
    isManager: (state) => state.user?.role === 'Manager',
    // المصادقة الثنائية إلزامية لكل المستخدمين (مدير ومحامين) لأن المحامين يطّلعون على ملفات العملاء كاملة.
    needsTotpSetup: (state) => !!state.user && state.user.totpEnabled === false
  },

  actions: {
    async login(email: string, password: string): Promise<SessionResult> {
      const { data } = await api.post<SessionResult>('/auth/login', { email, password })
      return data
    },

    async verifyTotp(mfaToken: string, code: string): Promise<SessionResult> {
      const { data } = await api.post<SessionResult>('/auth/login/totp', { mfaToken, code })
      this.applySession(data)
      return data
    },

    async changePassword(token: string, newPassword: string): Promise<SessionResult> {
      const { data } = await api.post<SessionResult>('/auth/change-password', { token, newPassword })
      this.applySession(data)
      return data
    },

    applySession(data: SessionResult) {
      if (data.status === 'ok' && data.accessToken && data.refreshToken && data.user) {
        this.accessToken = data.accessToken
        this.refreshToken = data.refreshToken
        this.user = data.user
        localStorage.setItem('mhd_access_token', data.accessToken)
        localStorage.setItem('mhd_refresh_token', data.refreshToken)
        localStorage.setItem('mhd_user', JSON.stringify(data.user))
      }
    },

    async refreshSession(): Promise<string | null> {
      if (!this.refreshToken) return null
      try {
        const { data } = await api.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
          refreshToken: this.refreshToken
        })
        this.accessToken = data.accessToken
        this.refreshToken = data.refreshToken
        localStorage.setItem('mhd_access_token', data.accessToken)
        localStorage.setItem('mhd_refresh_token', data.refreshToken)
        return data.accessToken
      } catch {
        return null
      }
    },

    async logout() {
      if (this.refreshToken) {
        try {
          await api.post('/auth/logout', { refreshToken: this.refreshToken })
        } catch {
          // تجاهل: الخروج المحلي يجب أن ينجح حتى لو تعذّر الاتصال بالخادم
        }
      }
      this.clearSession()
    },

    markTotpEnabled() {
      if (this.user) {
        this.user.totpEnabled = true
        localStorage.setItem('mhd_user', JSON.stringify(this.user))
      }
    },

    clearSession() {
      this.accessToken = null
      this.refreshToken = null
      this.user = null
      localStorage.removeItem('mhd_access_token')
      localStorage.removeItem('mhd_refresh_token')
      localStorage.removeItem('mhd_user')
    }
  }
})
