<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, isMock } from '../api'
import { MOCK_USERS } from '../api/mockData.js'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

function safeRedirect(target) {
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : '/'
}

async function doLogin(emailValue, passwordValue) {
  loading.value = true
  error.value = ''
  try {
    await auth.login(emailValue, passwordValue)
    router.replace(safeRedirect(route.query.redirect))
  } catch (e) {
    error.value = e instanceof ApiError ? (e.errors?.email?.[0] ?? e.message) : 'Terjadi kesalahan.'
  } finally {
    loading.value = false
  }
}

const submit = () => doLogin(email.value, password.value)
const quickLogin = (user) => doLogin(user.email, 'password')
</script>

<template>
  <section class="login">
    <form class="card" @submit.prevent="submit">
      <h1>Masuk</h1>
      <p class="muted">Gunakan akun yang diberikan admin.</p>

      <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>

      <div class="field">
        <label class="label" for="email">Email</label>
        <input id="email" v-model="email" class="input" type="email" autocomplete="username" required />
      </div>
      <div class="field">
        <label class="label" for="password">Kata sandi</label>
        <input
          id="password"
          v-model="password"
          class="input"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>

      <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
        {{ loading ? 'Memproses...' : 'Masuk' }}
      </button>
    </form>

    <aside v-if="isMock" class="card quick">
      <h2>Akun contoh (mode mock)</h2>
      <p class="muted">Kata sandi semua akun: <code>password</code>. Klik untuk masuk dengan role tersebut.</p>
      <ul>
        <li v-for="user in MOCK_USERS" :key="user.id">
          <button type="button" class="link-btn" :disabled="loading" @click="quickLogin(user)">
            {{ user.role_label }}
          </button>
          <span class="muted">{{ user.email }}</span>
        </li>
      </ul>
    </aside>
  </section>
</template>
