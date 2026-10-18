import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import DatasheetView from '../views/DatasheetView.vue'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import SearchView from '../views/SearchView.vue'
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
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return { name: 'home' }
  }
})

export default router
