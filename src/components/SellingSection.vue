<script setup>
import { computed, reactive, ref } from 'vue'
import { api, ApiError } from '../api'
import { copyText } from '../composables/useCopy.js'
import { useToast } from '../composables/useToast.js'
import { formatDate } from '../lib/files.js'
import { PITCH_MAX, SELLING_TYPES } from '../lib/selling.js'
import Icon from './Icon.vue'

const props = defineProps({
  type: { type: String, required: true }, // 'upsell' | 'cross'
  productId: { type: Number, required: true },
  products: { type: Array, required: true },
  entries: { type: Array, required: true }, // seluruh saran milik produk ini (kedua jenis)
  canWrite: { type: Boolean, default: false },
})
const emit = defineEmits(['created', 'updated', 'removed', 'open'])

const toast = useToast()
const meta = computed(() => SELLING_TYPES[props.type])
const shown = computed(() => props.entries.filter((e) => e.type === props.type))

const formMode = ref(null) // null | 'new' | entri yang sedang diubah
const form = reactive({ target_id: '', pitch: '' })
const saving = ref(false)
const errors = ref({})
const message = ref('')

// Produk yang sudah ada di daftar tidak ditawarkan lagi (kecuali milik entri yang sedang diubah).
const options = computed(() => {
  const own = formMode.value && formMode.value !== 'new' ? formMode.value.target_id : null
  const used = new Set(shown.value.map((e) => e.target_id))
  return props.products
    .filter((p) => p.id !== props.productId && (p.id === own || !used.has(p.id)))
    .sort((a, b) => a.sku.localeCompare(b.sku))
})

function openForm(entry = null) {
  errors.value = {}
  message.value = ''
  form.target_id = entry ? entry.target_id : ''
  form.pitch = entry ? entry.pitch : ''
  formMode.value = entry ?? 'new'
}

function closeForm() {
  formMode.value = null
  errors.value = {}
  message.value = ''
}

async function submit() {
  saving.value = true
  errors.value = {}
  message.value = ''
  const payload = { type: props.type, target_id: form.target_id, pitch: form.pitch }
  try {
    if (formMode.value === 'new') {
      emit('created', await api.createSelling(props.productId, payload))
    } else {
      emit('updated', await api.updateSelling(formMode.value.id, payload))
    }
    closeForm()
    toast.show('Saran disimpan')
  } catch (e) {
    errors.value = e instanceof ApiError ? e.errors : {}
    message.value = e.message
  } finally {
    saving.value = false
  }
}

async function remove(entry) {
  if (!window.confirm(`Hapus saran ini?\n\n${entry.target.sku} - ${entry.target.name}`)) return
  try {
    await api.deleteSelling(entry.id)
    emit('removed', entry.id)
    toast.show('Saran dihapus')
  } catch (e) {
    toast.show(e.message, 'error', 3500)
  }
}

async function copy(entry) {
  const ok = await copyText(entry.pitch)
  toast.show(
    ok ? 'Pesan disalin ke clipboard' : 'Tidak bisa menyalin. Salin manual dari kartu.',
    ok ? 'success' : 'error',
  )
}
</script>

<template>
  <section class="selling">
    <div class="section-head">
      <p class="muted">{{ meta.hint }}</p>
      <button
        v-if="canWrite && formMode === null"
        type="button"
        class="btn btn-primary"
        @click="openForm()"
      >
        <Icon name="plus" :size="16" /> Tambah saran
      </button>
    </div>

    <form v-if="formMode !== null" class="card faq-form" @submit.prevent="submit">
      <header class="form-head">
        <h3>{{ formMode === 'new' ? `Tambah ${meta.label}` : `Ubah ${meta.label}` }}</h3>
        <button type="button" class="icon-btn" aria-label="Tutup form" @click="closeForm">
          <Icon name="x" :size="18" />
        </button>
      </header>

      <p v-if="message && !Object.keys(errors).length" class="alert alert-error" role="alert">
        <Icon name="info" :size="16" /> {{ message }}
      </p>

      <div class="field">
        <label class="label" for="selling-target">Produk yang ditawarkan</label>
        <select id="selling-target" v-model="form.target_id" class="input" required>
          <option value="" disabled>Pilih produk...</option>
          <option v-for="p in options" :key="p.id" :value="p.id">{{ p.sku }} - {{ p.name }}</option>
        </select>
        <p v-if="errors.target_id" class="field-error">{{ errors.target_id[0] }}</p>
      </div>

      <div class="field">
        <label class="label" for="selling-pitch">Pesan untuk customer</label>
        <textarea
          id="selling-pitch"
          v-model="form.pitch"
          class="input"
          rows="4"
          :maxlength="PITCH_MAX"
          placeholder="Tulis kalimat yang siap disalin ke chat, termasuk alasan produk ini cocok."
          required
        ></textarea>
        <p v-if="errors.pitch" class="field-error">{{ errors.pitch[0] }}</p>
        <p class="field-hint">{{ form.pitch.length }} / {{ PITCH_MAX }}</p>
      </div>

      <div class="actions">
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Menyimpan...' : 'Simpan' }}
        </button>
        <button type="button" class="btn btn-ghost" :disabled="saving" @click="closeForm">
          Batal
        </button>
      </div>
    </form>

    <div v-if="!shown.length && formMode === null" class="empty-state">
      <p>
        <strong>{{ meta.empty }}</strong>
      </p>
      <p v-if="canWrite" class="muted">Klik "Tambah saran" untuk menulis yang pertama.</p>
    </div>

    <ul v-else class="selling-list">
      <li v-for="entry in shown" :key="entry.id" class="card selling-card">
        <button type="button" class="target-link" @click="emit('open', entry.target)">
          <span class="sku-chip">{{ entry.target.sku }}</span>
          <strong>{{ entry.target.name }}</strong>
          <Icon name="arrow" :size="15" />
        </button>
        <p class="selling-pitch">{{ entry.pitch }}</p>
        <footer class="faq-foot">
          <span class="muted small">Diperbarui {{ formatDate(entry.updated_at) }}</span>
          <div class="actions">
            <button type="button" class="btn btn-primary" @click="copy(entry)">
              <Icon name="copy" :size="16" /> Salin pesan
            </button>
            <template v-if="canWrite">
              <button type="button" class="btn btn-ghost" @click="openForm(entry)">
                <Icon name="edit" :size="16" /> <span class="hide-sm">Ubah</span>
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-danger-text"
                aria-label="Hapus saran"
                @click="remove(entry)"
              >
                <Icon name="trash" :size="16" /> <span class="hide-sm">Hapus</span>
              </button>
            </template>
          </div>
        </footer>
      </li>
    </ul>
  </section>
</template>
