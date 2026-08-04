import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const api = axios.create({
  baseURL: '/api',
  timeout: 20000
})

api.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
  }
  return config
})

let refreshing: Promise<string | null> | null = null

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const auth = useAuthStore()
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    if (error.response?.status === 401 && original && !original._retry && auth.refreshToken) {
      original._retry = true
      if (!refreshing) {
        refreshing = auth.refreshSession().finally(() => {
          refreshing = null
        })
      }
      const newToken = await refreshing
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      }
      auth.clearSession()
      router.push('/login')
    }

    return Promise.reject(error)
  }
)

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined
    if (data?.message) return data.message
    if (error.code === 'ECONNABORTED') return 'انتهت مهلة الاتصال بالخادم'
    if (!error.response) return 'تعذّر الاتصال بالخادم'
  }
  return 'حدث خطأ غير متوقع'
}

export default api
