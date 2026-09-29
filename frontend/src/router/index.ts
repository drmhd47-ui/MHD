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
        {
          path: 'intake-requests',
          name: 'intake-requests',
          component: () => import('@/views/intake/IntakeRequestsListView.vue')
        },
        {
          path: 'intake-requests/:id',
          name: 'intake-request',
          component: () => import('@/views/intake/IntakeRequestDetailView.vue'),
          props: true
        },
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
        { path: 'appointments', name: 'appointments', component: () => import('@/views/appointments/AppointmentsListView.vue') },
        {
          path: 'appointments/new',
          name: 'appointment-new',
          component: () => import('@/views/appointments/AppointmentFormView.vue')
        },
        {
          path: 'appointments/:id',
          name: 'appointment-edit',
          component: () => import('@/views/appointments/AppointmentFormView.vue'),
          props: true
        },
        { path: 'legal-archive', name: 'legal-archive', component: () => import('@/views/legal-archive/LegalArchiveListView.vue') },
        {
          path: 'legal-archive/new',
          name: 'legal-reference-new',
          component: () => import('@/views/legal-archive/LegalReferenceFormView.vue')
        },
        {
          path: 'legal-archive/:id',
          name: 'legal-reference-edit',
          component: () => import('@/views/legal-archive/LegalReferenceFormView.vue'),
          props: true
        },
        {
          path: 'invoices',
          name: 'invoices',
          component: () => import('@/views/billing/InvoicesListView.vue'),
          meta: { managerOnly: true }
        },
        {
          path: 'invoices/new',
          name: 'invoice-new',
          component: () => import('@/views/billing/InvoiceFormView.vue'),
          meta: { managerOnly: true }
        },
        {
          path: 'invoices/:id',
          name: 'invoice-edit',
          component: () => import('@/views/billing/InvoiceFormView.vue'),
          props: true,
          meta: { managerOnly: true }
        },
        {
          path: 'settings/office',
          name: 'office-settings',
          component: () => import('@/views/OfficeSettingsView.vue'),
          meta: { managerOnly: true }
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
