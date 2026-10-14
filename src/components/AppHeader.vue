<script setup>
import { useRouter } from 'vue-router'
import { api, isMock } from '../api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

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
      <RouterLink to="/" class="brand">Servolta <span class="brand-sub">FAQ Helper</span></RouterLink>

      <div v-if="auth.user" class="header-right">
        <span v-if="isMock" class="badge badge-warn" title="Data contoh tersimpan di browser ini">Mode mock</span>
        <button v-if="isMock" type="button" class="link-btn" @click="resetMock">Reset data contoh</button>
        <div class="user-chip">
          <strong>{{ auth.user.name }}</strong>
          <span class="muted">{{ auth.user.role_label }}</span>
        </div>
        <button type="button" class="btn btn-ghost" @click="onLogout">Keluar</button>
      </div>
    </div>
  </header>
</template>
