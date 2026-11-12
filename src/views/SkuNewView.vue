<script setup>
import { onMounted, ref } from 'vue'
import { api, ApiError } from '../api'
import Icon from '../components/Icon.vue'
import { useToast } from '../composables/useToast.js'
import { hints } from '../config.js'
import { cleanSpecs, normalizeSku, validateProduct } from '../lib/products.js'

const toast = useToast()

const COMMON_SPECS = [
  'Kapasitas',
  'Tegangan input',
  'Tegangan output',
  'Dimensi (P × L × T)',
  'Berat',
  'Garansi',
]

let uid = 0
const newRow = (label = '') => ({ id: ++uid, label, value: '' })

const sku = ref('')
const name = ref('')
const rows = ref([newRow()])
const saving = ref(false)
const errors = ref({})
const message = ref('')
const created = ref(null)
const existing = ref([])

onMounted(async () => {
  // Hanya untuk memberi tahu SKU kembar lebih awal; server tetap yang memutuskan.
  try {
    existing.value = (await api.listProducts()).map((p) => p.sku)
  } catch {
    existing.value = []
  }
})

function addRow() {
  rows.value = [...rows.value, newRow()]
}
function removeRow(id) {
  rows.value = rows.value.length > 1 ? rows.value.filter((r) => r.id !== id) : [newRow()]
}
function fillCommon() {
  const filled = rows.value.filter((r) => r.label.trim() || r.value.trim())
  const have = new Set(filled.map((r) => r.label.trim().toLowerCase()))
  rows.value = [...filled, ...COMMON_SPECS.filter((l) => !have.has(l.toLowerCase())).map(newRow)]
}

function reset() {
  sku.value = ''
  name.value = ''
  rows.value = [newRow()]
  errors.value = {}
  message.value = ''
  created.value = null
}

async function submit() {
  message.value = ''
  const payload = { sku: sku.value, name: name.value, specs: rows.value }
  errors.value = validateProduct(payload, existing.value)
  if (Object.keys(errors.value).length) return

  saving.value = true
  try {
    created.value = await api.createProduct({
      sku: normalizeSku(sku.value),
      name: name.value.trim(),
      specs: cleanSpecs(rows.value).specs.map(([label, value]) => ({ label, value })),
    })
    existing.value = [...existing.value, created.value.sku]
    toast.show('SKU disimpan')
  } catch (e) {
    errors.value = e instanceof ApiError ? e.errors : {}
    message.value = e.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="search-page">
    <header class="page-hero">
      <div>
        <h1>Tambah SKU</h1>
        <p class="muted">Daftarkan produk baru. Spesifikasi boleh diisi sekarang atau nanti.</p>
      </div>
    </header>

    <div v-if="created" class="card done" role="status">
      <p class="notice-title"><Icon name="check" :size="18" /> SKU berhasil ditambahkan</p>
      <p>
        <span class="sku-chip">{{ created.sku }}</span> {{ created.name }}
      </p>
      <p class="muted">Lanjutkan dengan mengisi data produk ini:</p>
      <div class="actions">
        <RouterLink :to="{ name: 'faq-new', query: { sku: created.sku } }" class="btn btn-primary">
          Tambah FAQ
        </RouterLink>
        <RouterLink :to="{ name: 'wiring-new', query: { sku: created.sku } }" class="btn">
          Tambah wiring
        </RouterLink>
        <button type="button" class="btn btn-ghost" @click="reset">Tambah SKU lagi</button>
      </div>
    </div>

    <form v-else class="card sku-form" novalidate @submit.prevent="submit">
      <p v-if="message && !Object.keys(errors).length" class="alert alert-error" role="alert">
        <Icon name="info" :size="16" /> {{ message }}
      </p>

      <div class="form-grid">
        <div class="field">
          <label class="label" for="sku">SKU</label>
          <input
            id="sku"
            v-model="sku"
            class="input input-mono"
            autocomplete="off"
            spellcheck="false"
            :placeholder="hints.sku"
            @blur="sku = normalizeSku(sku)"
          />
          <p v-if="errors.sku" class="field-error">{{ errors.sku[0] }}</p>
          <p v-else class="field-hint">Huruf besar otomatis. Harus unik.</p>
        </div>
        <div class="field">
          <label class="label" for="pname">Nama produk</label>
          <input
            id="pname"
            v-model="name"
            class="input"
            autocomplete="off"
            :placeholder="hints.skuName"
          />
          <p v-if="errors.name" class="field-error">{{ errors.name[0] }}</p>
        </div>
      </div>

      <fieldset class="specs-editor">
        <legend class="label">Spesifikasi (opsional)</legend>
        <div v-for="row in rows" :key="row.id" class="spec-row">
          <input
            v-model="row.label"
            class="input"
            placeholder="Nama, mis. Berat"
            aria-label="Nama spesifikasi"
          />
          <input
            v-model="row.value"
            class="input"
            placeholder="Nilai, mis. 9,5 kg"
            aria-label="Nilai spesifikasi"
          />
          <button
            type="button"
            class="icon-btn"
            aria-label="Hapus baris"
            @click="removeRow(row.id)"
          >
            <Icon name="x" :size="16" />
          </button>
        </div>
        <p v-if="errors.specs" class="field-error">{{ errors.specs[0] }}</p>
        <div class="actions">
          <button type="button" class="btn" @click="addRow">
            <Icon name="plus" :size="16" /> Tambah baris
          </button>
          <button type="button" class="btn btn-ghost" @click="fillCommon">
            Pakai kerangka umum
          </button>
        </div>
      </fieldset>

      <div class="actions">
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Menyimpan...' : 'Simpan SKU' }}
        </button>
        <button type="button" class="btn btn-ghost" :disabled="saving" @click="reset">
          Kosongkan
        </button>
      </div>
    </form>
  </section>
</template>
