<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api, ApiError } from '../api'
import Icon from '../components/Icon.vue'
import { useToast } from '../composables/useToast.js'
import { ROLE_LABELS, manageableRoles } from '../lib/roles.js'
import { normalizeEmail, validateUser } from '../lib/users.js'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const toast = useToast()

const users = ref([])
const loading = ref(true)
const pageError = ref('')
const query = ref('')

const formMode = ref(null) // null | 'new' | akun yang sedang diubah
const form = reactive({ name: '', email: '', role: '', password: '', is_active: true })
const errors = ref({})
const message = ref('')
const saving = ref(false)

const roleOptions = computed(() =>
  manageableRoles(auth.user.role).map((value) => ({ value, label: ROLE_LABELS[value] })),
)

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q
    ? users.value.filter((u) => `${u.name} ${u.email} ${u.role_label}`.toLowerCase().includes(q))
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

function openForm(user = null) {
  errors.value = {}
  message.value = ''
  form.name = user?.name ?? ''
  form.email = user?.email ?? ''
  form.role = user?.role ?? ''
  form.password = ''
  form.is_active = user?.is_active ?? true
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
    otherEmails: users.value.filter((u) => u.id !== editing?.id).map((u) => u.email),
    isEdit: Boolean(editing),
  })
  if (Object.keys(errors.value).length) return

  saving.value = true
  const payload = { ...form, email: normalizeEmail(form.email), name: form.name.trim() }
  try {
    if (editing) {
      const updated = await api.updateUser(editing.id, payload)
      users.value = users.value.map((u) => (u.id === updated.id ? updated : u))
    } else {
      users.value = [...users.value, await api.createUser(payload)]
    }
    closeForm()
    toast.show('Pengguna disimpan')
  } catch (e) {
    errors.value = e instanceof ApiError ? e.errors : {}
    message.value = e.message
  } finally {
    saving.value = false
  }
}

async function remove(user) {
  if (!window.confirm(`Hapus akun ini?\n\n${user.name} (${user.email})`)) return
  try {
    await api.deleteUser(user.id)
    users.value = users.value.filter((u) => u.id !== user.id)
    toast.show('Pengguna dihapus')
  } catch (e) {
    toast.show(e.message, 'error', 3500)
  }
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
          <label class="label" for="u-email">Email</label>
          <input id="u-email" v-model="form.email" class="input" type="email" autocomplete="off" />
          <p v-if="errors.email" class="field-error">{{ errors.email[0] }}</p>
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
        <div class="field">
          <label class="label" for="u-password">
            {{ formMode === 'new' ? 'Kata sandi' : 'Kata sandi baru' }}
          </label>
          <input
            id="u-password"
            v-model="form.password"
            class="input"
            type="password"
            autocomplete="new-password"
          />
          <p v-if="errors.password" class="field-error">{{ errors.password[0] }}</p>
          <p v-else class="field-hint">
            {{ formMode === 'new' ? 'Minimal 8 karakter.' : 'Kosongkan bila tidak diganti.' }}
          </p>
        </div>
      </div>

      <label class="check" for="u-active">
        <input id="u-active" v-model="form.is_active" type="checkbox" />
        Akun aktif (bisa login)
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
          placeholder="Cari nama, email, atau role..."
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
          <span class="muted small">{{ user.email }}</span>
        </div>
        <span class="user-role">{{ user.role_label }}</span>
        <span :class="['badge', user.is_active ? 'badge-ts' : 'badge-warn']">
          {{ user.is_active ? 'Aktif' : 'Nonaktif' }}
        </span>
        <div class="actions">
          <template v-if="user.id !== auth.user.id">
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
