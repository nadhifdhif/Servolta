<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api, ApiError } from '../api'
import Icon from '../components/Icon.vue'
import { hints } from '../config.js'
import { copyText } from '../composables/useCopy.js'
import { useToast } from '../composables/useToast.js'
import { generateCode, generatePassword, normalizeCode } from '../lib/loginCode.js'
import { ROLE_LABELS, manageableRoles } from '../lib/roles.js'
import { PASSWORD_MIN, validateUser } from '../lib/users.js'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const toast = useToast()

const users = ref([])
const loading = ref(true)
const pageError = ref('')
const query = ref('')

const formMode = ref(null) // null | 'new' | akun yang sedang diubah
const form = reactive({
  name: '',
  login_code: '',
  employee_id: '',
  role: '',
  password: '',
  is_active: true,
})
const errors = ref({})
const message = ref('')
const saving = ref(false)
const credentials = ref(null) // { name, login_code, password, reset } ditampilkan sekali setelah simpan

const roleOptions = computed(() =>
  manageableRoles(auth.user.role).map((value) => ({ value, label: ROLE_LABELS[value] })),
)

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q
    ? users.value.filter((u) =>
        `${u.name} ${u.login_code} ${u.employee_id ?? ''} ${u.role_label}`
          .toLowerCase()
          .includes(q),
      )
    : users.value
})

onMounted(async () => {
  try {
    users.value = await api.listUsers()
  } catch (e) {
    pageError.value = e.message
  } finally {
    loading.value = false
  }
})

function takenCodes(exceptId) {
  return users.value.filter((u) => u.id !== exceptId).map((u) => u.login_code)
}

function freshCode() {
  const taken = new Set(users.value.map((u) => u.login_code))
  let code
  do code = generateCode()
  while (taken.has(code))
  return code
}

function openForm(user = null) {
  errors.value = {}
  message.value = ''
  credentials.value = null
  form.name = user?.name ?? ''
  form.employee_id = user?.employee_id ?? ''
  form.role = user?.role ?? ''
  form.is_active = user?.is_active ?? true
  form.login_code = user?.login_code ?? freshCode()
  form.password = user ? '' : generatePassword() // akun baru: sandi sementara siap pakai
  formMode.value = user ?? 'new'
}

function closeForm() {
  formMode.value = null
  errors.value = {}
  message.value = ''
}

async function submit() {
  const editing = formMode.value !== 'new' ? formMode.value : null
  message.value = ''
  errors.value = validateUser(form, {
    actorRole: auth.user.role,
    otherCodes: takenCodes(editing?.id),
    otherEmployeeIds: users.value
      .filter((u) => u.id !== editing?.id)
      .map((u) => u.employee_id)
      .filter(Boolean),
    isEdit: Boolean(editing),
  })
  if (Object.keys(errors.value).length) return

  saving.value = true
  const payload = { ...form, login_code: normalizeCode(form.login_code), name: form.name.trim() }
  try {
    const saved = editing
      ? await api.updateUser(editing.id, payload)
      : await api.createUser(payload)
    users.value = editing
      ? users.value.map((u) => (u.id === saved.id ? saved : u))
      : [...users.value, saved]

    // Kode dan sandi sementara hanya diketahui sekarang: tampilkan sekali agar bisa diberikan ke orangnya.
    credentials.value =
      !editing || payload.password
        ? {
            name: saved.name,
            login_code: saved.login_code,
            password: payload.password,
            reset: Boolean(editing),
          }
        : null
    closeForm()
    toast.show('Pengguna disimpan')
  } catch (e) {
    errors.value = e instanceof ApiError ? e.errors : {}
    message.value = e.message
  } finally {
    saving.value = false
  }
}

async function unlock(user) {
  try {
    const updated = await api.unlockUser(user.id)
    users.value = users.value.map((u) => (u.id === updated.id ? updated : u))
    toast.show('Akun dibuka kuncinya')
  } catch (e) {
    toast.show(e.message, 'error', 3500)
  }
}

async function remove(user) {
  if (!window.confirm(`Hapus akun ini?\n\n${user.name} (${user.login_code})`)) return
  try {
    await api.deleteUser(user.id)
    users.value = users.value.filter((u) => u.id !== user.id)
    toast.show('Pengguna dihapus')
  } catch (e) {
    toast.show(e.message, 'error', 3500)
  }
}

async function copyCredentials() {
  const c = credentials.value
  const ok = await copyText(`Kode: ${c.login_code}\nKata sandi sementara: ${c.password}`)
  toast.show(
    ok ? 'Kode dan kata sandi disalin' : 'Tidak bisa menyalin. Salin manual.',
    ok ? 'success' : 'error',
  )
}
</script>

<template>
  <section class="search-page">
    <header class="page-hero">
      <div>
        <h1>Pengguna</h1>
        <p class="muted">
          {{
            auth.user.role === 'admin'
              ? 'Tambah akun dan atur role seluruh tim.'
              : 'Tambah akun dan atur role staf di bawah Supervisor.'
          }}
        </p>
      </div>
    </header>

    <p v-if="pageError" class="alert alert-error" role="alert">
      <Icon name="info" :size="16" /> {{ pageError }}
    </p>

    <div v-if="credentials" class="card credentials" role="status">
      <p class="notice-title">
        <Icon name="check" :size="18" />
        {{ credentials.reset ? 'Kata sandi direset' : 'Akun dibuat' }}: {{ credentials.name }}
      </p>
      <dl class="credential-values">
        <div>
          <dt>Kode login</dt>
          <dd class="mono">{{ credentials.login_code }}</dd>
        </div>
        <div>
          <dt>Kata sandi sementara</dt>
          <dd class="mono">{{ credentials.password }}</dd>
        </div>
      </dl>
      <p class="muted small">
        Berikan kepada orangnya lewat jalur yang aman. Kata sandi ini
        <strong>tidak akan ditampilkan lagi</strong>, dan orangnya wajib menggantinya saat masuk
        pertama.
      </p>
      <div class="actions">
        <button type="button" class="btn btn-primary" @click="copyCredentials">
          <Icon name="copy" :size="16" /> Salin kode dan sandi
        </button>
        <button type="button" class="btn btn-ghost" @click="credentials = null">Tutup</button>
      </div>
    </div>

    <form v-if="formMode !== null" class="card faq-form" novalidate @submit.prevent="submit">
      <header class="form-head">
        <h3>{{ formMode === 'new' ? 'Tambah pengguna' : 'Ubah pengguna' }}</h3>
        <button type="button" class="icon-btn" aria-label="Tutup form" @click="closeForm">
          <Icon name="x" :size="18" />
        </button>
      </header>

      <p v-if="message && !Object.keys(errors).length" class="alert alert-error" role="alert">
        <Icon name="info" :size="16" /> {{ message }}
      </p>

      <div class="form-grid user-grid">
        <div class="field">
          <label class="label" for="u-name">Nama</label>
          <input id="u-name" v-model="form.name" class="input" autocomplete="off" />
          <p v-if="errors.name" class="field-error">{{ errors.name[0] }}</p>
        </div>

        <div class="field">
          <label class="label" for="u-code">Kode login</label>
          <div class="input-group">
            <input
              id="u-code"
              v-model="form.login_code"
              class="input input-mono input-code"
              autocomplete="off"
              spellcheck="false"
              :placeholder="hints.code"
            />
            <button
              type="button"
              class="input-addon addon-text"
              @click="form.login_code = freshCode()"
            >
              Acak
            </button>
          </div>
          <p v-if="errors.login_code" class="field-error">{{ errors.login_code[0] }}</p>
          <p v-else class="field-hint">
            Dipakai untuk masuk. Huruf besar dan angka, 4 sampai 20 karakter.
          </p>
        </div>

        <div class="field">
          <label class="label" for="u-employee">ID karyawan (opsional)</label>
          <input
            id="u-employee"
            v-model="form.employee_id"
            class="input input-mono"
            inputmode="numeric"
            autocomplete="off"
          />
          <p v-if="errors.employee_id" class="field-error">{{ errors.employee_id[0] }}</p>
          <p v-else class="field-hint">Hanya catatan. Tidak dipakai untuk masuk.</p>
        </div>

        <div class="field">
          <label class="label" for="u-role">Role</label>
          <select id="u-role" v-model="form.role" class="input">
            <option value="" disabled>Pilih role...</option>
            <option v-for="role in roleOptions" :key="role.value" :value="role.value">
              {{ role.label }}
            </option>
          </select>
          <p v-if="errors.role" class="field-error">{{ errors.role[0] }}</p>
        </div>

        <div class="field field-wide">
          <label class="label" for="u-password">
            {{ formMode === 'new' ? 'Kata sandi sementara' : 'Reset kata sandi (opsional)' }}
          </label>
          <div class="input-group">
            <input
              id="u-password"
              v-model="form.password"
              class="input input-mono"
              autocomplete="off"
              spellcheck="false"
            />
            <button
              type="button"
              class="input-addon addon-text"
              @click="form.password = generatePassword()"
            >
              Acak
            </button>
          </div>
          <p v-if="errors.password" class="field-error">{{ errors.password[0] }}</p>
          <p v-else class="field-hint">
            Minimal {{ PASSWORD_MIN }} karakter.
            {{
              formMode === 'new'
                ? 'Orangnya wajib menggantinya saat masuk pertama.'
                : 'Kosongkan bila tidak diganti. Bila diisi, orangnya wajib menggantinya lagi.'
            }}
          </p>
        </div>
      </div>

      <label class="check" for="u-active">
        <input id="u-active" v-model="form.is_active" type="checkbox" />
        Akun aktif (bisa masuk)
      </label>

      <div class="actions">
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Menyimpan...' : 'Simpan' }}
        </button>
        <button type="button" class="btn btn-ghost" :disabled="saving" @click="closeForm">
          Batal
        </button>
      </div>
    </form>

    <div class="toolbar">
      <div class="search-field">
        <Icon name="search" :size="16" />
        <input
          v-model="query"
          class="input"
          type="search"
          placeholder="Cari nama, kode, atau role..."
          aria-label="Cari pengguna"
        />
      </div>
      <button v-if="formMode === null" type="button" class="btn btn-primary" @click="openForm()">
        <Icon name="plus" :size="16" /> Tambah pengguna
      </button>
    </div>

    <div v-if="loading" class="card skeleton" aria-busy="true"></div>

    <div v-else-if="!visible.length" class="empty-state">
      <p>
        <strong>{{
          users.length ? 'Tidak ada yang cocok dengan pencarian' : 'Belum ada pengguna'
        }}</strong>
      </p>
    </div>

    <ul v-else class="user-list">
      <li v-for="user in visible" :key="user.id" class="user-row">
        <div class="user-main">
          <strong>{{ user.name }}</strong>
          <span v-if="user.id === auth.user.id" class="badge">Anda</span>
          <span class="muted small">
            <span class="mono">{{ user.login_code }}</span>
            <template v-if="user.employee_id"> · ID {{ user.employee_id }}</template>
          </span>
        </div>
        <span class="user-role">{{ user.role_label }}</span>
        <span class="user-status">
          <span :class="['badge', user.is_active ? 'badge-ts' : 'badge-warn']">
            {{ user.is_active ? 'Aktif' : 'Nonaktif' }}
          </span>
          <span v-if="user.is_locked" class="badge badge-warn">Terkunci</span>
          <span v-else-if="user.must_change_password" class="badge">Sandi sementara</span>
        </span>
        <div class="actions">
          <template v-if="user.id !== auth.user.id">
            <button v-if="user.is_locked" type="button" class="btn btn-ghost" @click="unlock(user)">
              Buka kunci
            </button>
            <button type="button" class="btn btn-ghost" @click="openForm(user)">
              <Icon name="edit" :size="16" /> <span class="hide-sm">Ubah</span>
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-danger-text"
              :aria-label="`Hapus ${user.name}`"
              @click="remove(user)"
            >
              <Icon name="trash" :size="16" /> <span class="hide-sm">Hapus</span>
            </button>
          </template>
        </div>
      </li>
    </ul>
  </section>
</template>
