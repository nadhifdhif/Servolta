<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, isMock } from '../api'
import { MOCK_ACCOUNTS } from '../api/mockAccounts.js'
import Icon from '../components/Icon.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

function safeRedirect(target) {
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
    ? target
    : '/'
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
const quickLogin = (account) => doLogin(account.email, account.password)
</script>

<template>
  <section class="login-page">
    <form class="card login-card" @submit.prevent="submit">
      <h1>Servolta</h1>
      <p class="muted">Masuk dengan akun yang diberikan admin.</p>

      <p v-if="error" class="alert alert-error" role="alert">
        <Icon name="info" :size="16" /> {{ error }}
      </p>

      <div class="field">
        <label class="label" for="email">Email</label>
        <input
          id="email"
          v-model="email"
          class="input"
          type="email"
          autocomplete="username"
          placeholder="nama@perusahaan.com"
          required
        />
      </div>

      <div class="field">
        <label class="label" for="password">Kata sandi</label>
        <div class="input-group">
          <input
            id="password"
            v-model="password"
            class="input"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            required
          />
          <button
            type="button"
            class="input-addon"
            :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
            @click="showPassword = !showPassword"
          >
            <Icon :name="showPassword ? 'eye-off' : 'eye'" :size="18" />
          </button>
        </div>
      </div>

      <button type="submit" class="btn btn-primary btn-lg btn-block" :disabled="loading">
        {{ loading ? 'Memproses...' : 'Masuk' }}
      </button>
    </form>

    <aside v-if="isMock" class="card mock-panel">
      <header class="mock-head">
        <h2>Akun contoh</h2>
        <span class="badge badge-warn">Mode mock</span>
      </header>
      <p class="muted">
        Kata sandi semua akun: <code>password</code>. Klik salah satu untuk masuk.
      </p>
      <ul class="account-grid">
        <li v-for="account in MOCK_ACCOUNTS" :key="account.id">
          <button type="button" class="account" :disabled="loading" @click="quickLogin(account)">
            <span class="account-meta">
              <strong>{{ account.role_label }}</strong>
              <small>{{ account.name }} · {{ account.email }}</small>
              <small v-if="account.note" class="account-note">{{ account.note }}</small>
            </span>
          </button>
        </li>
      </ul>
    </aside>
  </section>
</template>
