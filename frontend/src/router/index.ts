import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    managerOnly?: boolean
    allowWithoutTotp?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
    {
      path: '/',
      component: () => import('@/layouts/AppShell.vue'),
      children: [
        { path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
        { path: 'clients', name: 'clients', component: () => import('@/views/clients/ClientsListView.vue') },
        { path: 'clients/new', name: 'client-new', component: () => import('@/views/clients/ClientFormView.vue') },
        {
          path: 'clients/:id',
          name: 'client-edit',
          component: () => import('@/views/clients/ClientFormView.vue'),
          props: true
        },
        { path: 'cases', name: 'cases', component: () => import('@/views/cases/CasesListView.vue') },
        { path: 'cases/new', name: 'case-new', component: () => import('@/views/cases/CaseFormView.vue') },
        {
          path: 'cases/:id',
          name: 'case-edit',
          component: () => import('@/views/cases/CaseFormView.vue'),
          props: true
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/UsersView.vue'),
          meta: { managerOnly: true }
        },
        {
          path: 'audit-log',
          name: 'audit-log',
          component: () => import('@/views/AuditLogView.vue'),
          meta: { managerOnly: true }
        },
        {
          path: 'security/totp-setup',
          name: 'totp-setup',
          component: () => import('@/views/TotpSetupView.vue'),
          meta: { allowWithoutTotp: true }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { public: true }
    }
  ]
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.public) return true

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (auth.needsTotpSetup && !to.meta.allowWithoutTotp) {
    return { name: 'totp-setup' }
  }

  if (to.meta.managerOnly && !auth.isManager) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
