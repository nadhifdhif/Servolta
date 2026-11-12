import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import DatasheetView from '../views/DatasheetView.vue'
import FaqNewView from '../views/FaqNewView.vue'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import SearchView from '../views/SearchView.vue'
import SkuNewView from '../views/SkuNewView.vue'
import SnippetsView from '../views/SnippetsView.vue'
import UsersView from '../views/UsersView.vue'
import WiringNewView from '../views/WiringNewView.vue'
import WiringView from '../views/WiringView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { requiresAuth: true } },
    { path: '/faq', name: 'faq', component: SearchView, meta: { requiresAuth: true } },
    { path: '/wiring', name: 'wiring', component: WiringView, meta: { requiresAuth: true } },
    {
      path: '/datasheet',
      name: 'datasheet',
      component: DatasheetView,
      meta: { requiresAuth: true },
    },
    { path: '/kode', name: 'snippets', component: SnippetsView, meta: { requiresAuth: true } },
    {
      path: '/faq/baru',
      name: 'faq-new',
      component: FaqNewView,
      meta: { requiresAuth: true, perm: 'write_faq' },
    },
    {
      path: '/sku/baru',
      name: 'sku-new',
      component: SkuNewView,
      meta: { requiresAuth: true, perm: 'write_products' },
    },
    {
      path: '/wiring/baru',
      name: 'wiring-new',
      component: WiringNewView,
      meta: { requiresAuth: true, perm: 'write_products' },
    },
    {
      path: '/pengguna',
      name: 'users',
      component: UsersView,
      meta: { requiresAuth: true, perm: 'manage_users' },
    },
    { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
    { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  // Halaman tambah data hanya untuk role yang berhak; server tetap memeriksa ulang.
  if (to.meta.perm && !auth.permissions[to.meta.perm]) {
    return { name: 'home' }
  }
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return { name: 'home' }
  }
})

export default router
