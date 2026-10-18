<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '../api'
import FaqCard from '../components/FaqCard.vue'
import FaqForm from '../components/FaqForm.vue'
import Icon from '../components/Icon.vue'
import ProductCombobox from '../components/ProductCombobox.vue'
import { useRecent } from '../composables/useRecent.js'
import { useToast } from '../composables/useToast.js'
import { normalize } from '../lib/search.js'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { add: addRecent } = useRecent(() => auth.user?.id)

const products = ref([])
const loadingProducts = ref(true)
const pageError = ref('')

const selected = ref(null)
const faqs = ref([])
const loadingFaqs = ref(false)

const category = ref('all')
const faqQuery = ref('')

const formMode = ref(null) // null | 'new' | objek faq yang sedang diubah
const saving = ref(false)
const formErrors = ref({})
const formMessage = ref('')

const TABS = [
  { key: 'all', label: 'Semua', short: 'Semua' },
  { key: 'cs', label: 'Customer Service', short: 'CS' },
  { key: 'ts', label: 'Technical Support', short: 'TS' },
]

const canWrite = computed(() => auth.permissions.write_faq === true)

const counts = computed(() => ({
  all: faqs.value.length,
  cs: faqs.value.filter((f) => f.category === 'cs').length,
  ts: faqs.value.filter((f) => f.category === 'ts').length,
}))

const visibleFaqs = computed(() => {
  const q = normalize(faqQuery.value)
  return faqs.value.filter((f) => {
    const categoryOk = category.value === 'all' || f.category === category.value
    const textOk = !q || normalize(`${f.question} ${f.answer}`).includes(q)
    return categoryOk && textOk
  })
})

onMounted(async () => {
  try {
    products.value = await api.listProducts()
    // Dari "Terakhir Anda lihat" di beranda: /faq?sku=SVR-1000 langsung membuka produknya.
    const sku = route.query.sku
    if (typeof sku === 'string') {
      selected.value = products.value.find((p) => p.sku === sku) ?? null
    }
  } catch (e) {
    pageError.value = e.message
  } finally {
    loadingProducts.value = false
  }
})

watch(selected, async (product) => {
  category.value = 'all'
  faqQuery.value = ''
  closeForm()
  faqs.value = []
  pageError.value = ''
  loadingFaqs.value = false
  router.replace({ query: product ? { sku: product.sku } : {} })
  if (!product) return
  addRecent(product)

  loadingFaqs.value = true
  try {
    const result = await api.listFaqs(product.id)
    // Abaikan hasil lama bila pengguna sudah memilih produk lain.
    if (selected.value?.id === product.id) faqs.value = result
  } catch (e) {
    pageError.value = e.message
  } finally {
    if (selected.value?.id === product.id) loadingFaqs.value = false
  }
})

function openNew() {
  resetFormState()
  formMode.value = 'new'
}

function openEdit(faq) {
  resetFormState()
  formMode.value = faq
}

function closeForm() {
  formMode.value = null
  resetFormState()
}

function resetFormState() {
  formErrors.value = {}
  formMessage.value = ''
  saving.value = false
}

async function saveFaq(payload) {
  saving.value = true
  formErrors.value = {}
  formMessage.value = ''
  try {
    if (formMode.value === 'new') {
      const created = await api.createFaq(selected.value.id, payload)
      faqs.value = [...faqs.value, created]
    } else {
      const updated = await api.updateFaq(formMode.value.id, payload)
      faqs.value = faqs.value.map((f) => (f.id === updated.id ? updated : f))
    }
    closeForm()
    toast.show('FAQ disimpan')
  } catch (e) {
    formErrors.value = e instanceof ApiError ? e.errors : {}
    formMessage.value = e.message
  } finally {
    saving.value = false
  }
}

async function removeFaq(faq) {
  if (!window.confirm(`Hapus FAQ ini?\n\n${faq.question}`)) return
  try {
    await api.deleteFaq(faq.id)
    faqs.value = faqs.value.filter((f) => f.id !== faq.id)
    toast.show('FAQ dihapus')
  } catch (e) {
    toast.show(e.message, 'error', 3500)
  }
}
</script>

<template>
  <section class="search-page">
    <header class="page-hero">
      <h1>Cari FAQ produk</h1>
      <p>Ketik SKU atau nama barang, pilih produknya, lalu salin jawaban untuk customer.</p>

      <p v-if="loadingProducts" class="hero-status">Memuat daftar produk...</p>
      <ProductCombobox v-else v-model="selected" :products="products" />
      <p v-if="!loadingProducts && !pageError" class="hero-status">
        <Icon name="box" :size="14" /> {{ products.length }} produk terdaftar
      </p>
    </header>

    <p v-if="pageError" class="alert alert-error" role="alert">
      <Icon name="info" :size="16" /> {{ pageError }}
    </p>

    <div v-if="!selected && !loadingProducts" class="empty-state">
      <span class="empty-icon"><Icon name="search" :size="26" /></span>
      <p><strong>Belum ada produk dipilih</strong></p>
      <p class="muted">Mulai ketik SKU atau nama barang di kotak pencarian di atas.</p>
    </div>

    <template v-if="selected">
      <div class="card product-head">
        <span class="product-icon"><Icon name="box" :size="24" /></span>
        <div class="product-info">
          <span class="sku-chip">{{ selected.sku }}</span>
          <h2>{{ selected.name }}</h2>
          <p class="muted small">{{ counts.all }} FAQ tersedia</p>
        </div>
        <button
          v-if="canWrite && formMode === null"
          type="button"
          class="btn btn-primary"
          @click="openNew"
        >
          <Icon name="plus" :size="16" /> Tambah FAQ
        </button>
      </div>

      <FaqForm
        v-if="formMode !== null"
        :key="formMode === 'new' ? 'new' : formMode.id"
        :initial="formMode === 'new' ? null : formMode"
        :saving="saving"
        :errors="formErrors"
        :message="formMessage"
        @save="saveFaq"
        @cancel="closeForm"
      />

      <div class="toolbar">
        <div class="segmented" role="tablist" aria-label="Kategori FAQ">
          <button
            v-for="tab in TABS"
            :key="tab.key"
            type="button"
            role="tab"
            :aria-selected="category === tab.key"
            :class="['seg', { active: category === tab.key }]"
            @click="category = tab.key"
          >
            <span class="seg-full">{{ tab.label }}</span>
            <span class="seg-short">{{ tab.short }}</span>
            <span class="count">{{ counts[tab.key] }}</span>
          </button>
        </div>
        <div class="search-field">
          <Icon name="search" :size="16" />
          <input
            v-model="faqQuery"
            class="input"
            type="search"
            placeholder="Cari di dalam FAQ..."
            aria-label="Cari di dalam FAQ"
          />
        </div>
      </div>

      <div v-if="loadingFaqs" class="faq-list" aria-busy="true">
        <div v-for="n in 3" :key="n" class="card skeleton"></div>
      </div>

      <div v-else-if="!visibleFaqs.length" class="empty-state">
        <span class="empty-icon"><Icon name="message" :size="26" /></span>
        <p>
          <strong>{{
            faqs.length
              ? 'Tidak ada FAQ yang cocok dengan filter'
              : 'Belum ada FAQ untuk produk ini'
          }}</strong>
        </p>
        <p v-if="!faqs.length && canWrite" class="muted">
          Klik "Tambah FAQ" untuk membuat yang pertama.
        </p>
      </div>

      <div v-else class="faq-list">
        <FaqCard
          v-for="faq in visibleFaqs"
          :key="faq.id"
          :faq="faq"
          :can-write="canWrite"
          @edit="openEdit"
          @remove="removeFaq"
        />
      </div>
    </template>
  </section>
</template>
