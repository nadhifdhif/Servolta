<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, isMock } from '../api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const MENU = [
  { to: '/faq', label: 'FAQ', carry: true },
  { to: '/wiring', label: 'Wiring', carry: true },
  { to: '/datasheet', label: 'Datasheet', carry: true },
  { to: '/kode', label: 'Kode', carry: false },
  { to: '/pengguna', label: 'Pengguna', carry: false, perm: 'manage_users' },
]

const menu = computed(() => MENU.filter((item) => !item.perm || auth.permissions[item.perm]))

// Berpindah antar menu produk tetap di SKU yang sedang dipilih.
function menuTarget(item) {
  const sku = route.query.sku
  return { path: item.to, query: item.carry && typeof sku === 'string' ? { sku } : {} }
}

async function onLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}

function resetMock() {
  api.resetMock?.()
  window.location.reload()
}
</script>

<template>
  <header class="app-header">
    <div class="container header-inner">
      <RouterLink :to="{ name: 'home' }" class="brand" aria-label="Servolta, ke beranda">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
        Servolta
      </RouterLink>

      <nav v-if="auth.user" class="menu" aria-label="Menu utama">
        <RouterLink
          v-for="item in menu"
          :key="item.to"
          :to="menuTarget(item)"
          class="menu-item"
          active-class="active"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div v-if="auth.user" class="header-right">
        <template v-if="isMock">
          <span class="badge badge-warn hide-sm" title="Data contoh tersimpan di browser ini"
            >Mock</span
          >
          <button type="button" class="link-btn hide-sm" @click="resetMock">Reset data</button>
        </template>
        <div class="user-meta hide-sm">
          <strong>{{ auth.user.name }}</strong>
          <span>{{ auth.user.role_label }}</span>
        </div>
        <button type="button" class="btn btn-ghost" @click="onLogout">Keluar</button>
      </div>
    </div>
  </header>
</template>
