<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { api, ApiError } from '../api'
import FaqCard from '../components/FaqCard.vue'
import FaqForm from '../components/FaqForm.vue'
import ProductCombobox from '../components/ProductCombobox.vue'
import { normalize } from '../lib/search.js'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

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
  if (!product) return

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
  } catch (e) {
    pageError.value = e.message
  }
}
</script>

<template>
  <section class="search-page">
    <p v-if="pageError" class="alert alert-error" role="alert">{{ pageError }}</p>

    <p v-if="loadingProducts" class="muted">Memuat daftar produk...</p>
    <ProductCombobox v-else v-model="selected" :products="products" />

    <div v-if="!selected && !loadingProducts" class="empty-state">
      <p>Pilih atau ketik SKU / nama barang untuk menampilkan FAQ-nya.</p>
      <p class="muted">{{ products.length }} produk tersedia.</p>
    </div>

    <template v-if="selected">
      <header class="product-head">
        <div>
          <span class="sku">{{ selected.sku }}</span>
          <h2>{{ selected.name }}</h2>
        </div>
        <button v-if="canWrite && formMode === null" type="button" class="btn btn-primary" @click="openNew">
          + Tambah FAQ
        </button>
      </header>

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
        <div class="tabs" role="tablist" aria-label="Kategori FAQ">
          <button
            v-for="tab in [
              { key: 'all', label: 'Semua' },
              { key: 'cs', label: 'Customer Service' },
              { key: 'ts', label: 'Technical Support' },
            ]"
            :key="tab.key"
            type="button"
            role="tab"
            :aria-selected="category === tab.key"
            :class="['tab', { active: category === tab.key }]"
            @click="category = tab.key"
          >
            {{ tab.label }} <span class="count">{{ counts[tab.key] }}</span>
          </button>
        </div>
        <input v-model="faqQuery" class="input" type="search" placeholder="Cari di dalam FAQ..." />
      </div>

      <p v-if="loadingFaqs" class="muted">Memuat FAQ...</p>
      <p v-else-if="!visibleFaqs.length" class="empty-state">
        {{ faqs.length ? 'Tidak ada FAQ yang cocok dengan filter.' : 'Belum ada FAQ untuk produk ini.' }}
      </p>

      <div class="faq-list">
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
