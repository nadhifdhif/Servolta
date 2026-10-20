<script setup>
import { useRoute, useRouter } from 'vue-router'
import { api, isMock } from '../api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const MENU = [
  { to: '/faq', label: 'FAQ' },
  { to: '/wiring', label: 'Wiring' },
  { to: '/datasheet', label: 'Datasheet' },
]

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
      <RouterLink :to="{ name: 'home' }" class="brand">Servolta</RouterLink>

      <nav v-if="auth.user" class="menu" aria-label="Menu utama">
        <RouterLink
          v-for="item in MENU"
          :key="item.to"
          :to="{
            path: item.to,
            query: typeof route.query.sku === 'string' ? { sku: route.query.sku } : {},
          }"
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
