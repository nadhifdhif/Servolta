<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '../api'
import Icon from '../components/Icon.vue'
import { useToast } from '../composables/useToast.js'
import { PASSWORD_MIN, validatePasswordChange } from '../lib/users.js'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const form = reactive({ current_password: '', password: '', password_confirmation: '' })
const errors = ref({})
const message = ref('')
const saving = ref(false)
const show = ref(false)

const forced = computed(() => auth.mustChangePassword)

async function submit() {
  message.value = ''
  errors.value = validatePasswordChange(form)
  if (Object.keys(errors.value).length) return

  saving.value = true
  try {
    const result = await api.changePassword({ ...form })
    auth.setUser(result.user ?? { ...auth.user, must_change_password: false })
    form.current_password = form.password = form.password_confirmation = ''
    toast.show('Kata sandi diubah')
    if (forced.value === false) router.replace({ name: 'home' })
  } catch (e) {
    errors.value = e instanceof ApiError ? e.errors : {}
    message.value = e.message
  } finally {
    saving.value = false
  }
}

async function logoutEverywhere() {
  if (!window.confirm('Keluar dari semua perangkat, termasuk yang sedang dipakai ini?')) return
  try {
    await api.logoutAll()
  } finally {
    auth.clearSession()
    router.replace({ name: 'login' })
  }
}
</script>

<template>
  <section class="search-page account-page">
    <header class="page-hero">
      <div>
        <h1>Akun saya</h1>
        <p class="muted">Data akun dan kata sandi Anda.</p>
      </div>
    </header>

    <p v-if="forced" class="alert alert-warn" role="alert">
      <Icon name="info" :size="16" />
      Anda masih memakai kata sandi sementara dari admin. Buat kata sandi baru sebelum melanjutkan.
    </p>

    <dl class="card account-info">
      <div>
        <dt>Nama</dt>
        <dd>{{ auth.user.name }}</dd>
      </div>
      <div>
        <dt>Kode login</dt>
        <dd class="mono">{{ auth.user.login_code }}</dd>
      </div>
      <div>
        <dt>Role</dt>
        <dd>{{ auth.user.role_label }}</dd>
      </div>
      <div v-if="auth.user.employee_id">
        <dt>ID karyawan</dt>
        <dd class="mono">{{ auth.user.employee_id }}</dd>
      </div>
    </dl>

    <form class="card faq-form" novalidate @submit.prevent="submit">
      <header class="form-head">
        <h3>Ganti kata sandi</h3>
      </header>

      <p v-if="message && !Object.keys(errors).length" class="alert alert-error" role="alert">
        <Icon name="info" :size="16" /> {{ message }}
      </p>

      <div class="field">
        <label class="label" for="a-current">Kata sandi saat ini</label>
        <input
          id="a-current"
          v-model="form.current_password"
          class="input"
          :type="show ? 'text' : 'password'"
          autocomplete="current-password"
        />
        <p v-if="errors.current_password" class="field-error">{{ errors.current_password[0] }}</p>
      </div>
      <div class="field">
        <label class="label" for="a-new">Kata sandi baru</label>
        <input
          id="a-new"
          v-model="form.password"
          class="input"
          :type="show ? 'text' : 'password'"
          autocomplete="new-password"
        />
        <p v-if="errors.password" class="field-error">{{ errors.password[0] }}</p>
        <p v-else class="field-hint">
          Minimal {{ PASSWORD_MIN }} karakter. Kalimat panjang lebih kuat daripada kata pendek yang
          rumit.
        </p>
      </div>
      <div class="field">
        <label class="label" for="a-confirm">Ulangi kata sandi baru</label>
        <input
          id="a-confirm"
          v-model="form.password_confirmation"
          class="input"
          :type="show ? 'text' : 'password'"
          autocomplete="new-password"
        />
        <p v-if="errors.password_confirmation" class="field-error">
          {{ errors.password_confirmation[0] }}
        </p>
      </div>

      <label class="check" for="a-show">
        <input id="a-show" v-model="show" type="checkbox" /> Tampilkan kata sandi
      </label>

      <div class="actions">
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Menyimpan...' : 'Simpan kata sandi' }}
        </button>
      </div>
    </form>

    <div v-if="!forced" class="card account-danger">
      <div>
        <h3>Keluar dari semua perangkat</h3>
        <p class="muted small">
          Gunakan bila Anda lupa keluar di komputer bersama atau perangkat hilang.
        </p>
      </div>
      <button type="button" class="btn btn-danger-text" @click="logoutEverywhere">
        Keluar dari semua
      </button>
    </div>
  </section>
</template>
