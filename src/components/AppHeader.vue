<script setup>
import { useRoute, useRouter } from 'vue-router'
import { api, isMock } from '../api'
import { useAuthStore } from '../stores/auth'
import Icon from './Icon.vue'
import UserAvatar from './UserAvatar.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const MENU = [
  { to: '/faq', label: 'FAQ', icon: 'message' },
  { to: '/wiring', label: 'Wiring', icon: 'plug' },
  { to: '/datasheet', label: 'Datasheet', icon: 'file' },
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
      <RouterLink :to="{ name: 'home' }" class="brand">
        <span class="brand-mark"><Icon name="zap" :size="18" /></span>
        <span class="brand-text">Servolta<span class="brand-sub">FAQ Helper</span></span>
      </RouterLink>

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
          <Icon :name="item.icon" :size="17" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div v-if="auth.user" class="header-right">
        <span v-if="isMock" class="badge badge-warn" title="Data contoh tersimpan di browser ini"
          >Mode mock</span
        >
        <button v-if="isMock" type="button" class="link-btn hide-sm" @click="resetMock">
          Reset data contoh
        </button>
        <div class="user-chip">
          <UserAvatar :name="auth.user.name" :role="auth.user.role" />
          <div class="user-meta hide-sm">
            <strong>{{ auth.user.name }}</strong>
            <span>{{ auth.user.role_label }}</span>
          </div>
        </div>
        <button type="button" class="btn btn-ghost" aria-label="Keluar" @click="onLogout">
          <Icon name="logout" :size="16" />
          <span class="hide-sm">Keluar</span>
        </button>
      </div>
    </div>
  </header>
</template>
