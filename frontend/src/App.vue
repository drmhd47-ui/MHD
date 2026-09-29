<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const IDLE_LIMIT_MS = 30 * 60 * 1000
let idleTimer: ReturnType<typeof setTimeout> | undefined

function resetIdleTimer() {
  if (!auth.isAuthenticated) return
  clearTimeout(idleTimer)
  idleTimer = setTimeout(async () => {
    await auth.logout()
    router.push('/login')
  }, IDLE_LIMIT_MS)
}

const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll']

onMounted(() => {
  activityEvents.forEach((ev) => window.addEventListener(ev, resetIdleTimer))
  resetIdleTimer()
})

// يبدأ عدّاد الخمول فور تسجيل الدخول، لا مع أول حركة بعده.
watch(
  () => auth.isAuthenticated,
  (loggedIn) => {
    if (loggedIn) resetIdleTimer()
    else clearTimeout(idleTimer)
  }
)

onUnmounted(() => {
  activityEvents.forEach((ev) => window.removeEventListener(ev, resetIdleTimer))
  clearTimeout(idleTimer)
})
</script>

<template>
  <router-view />
</template>
