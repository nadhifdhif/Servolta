<script setup>
import { computed, ref, watch } from 'vue'
import { api, ApiError } from '../api'
import Icon from '../components/Icon.vue'
import ProductHero from '../components/ProductHero.vue'
import UploadPanel from '../components/UploadPanel.vue'
import { useProductPicker } from '../composables/useProductPicker.js'
import { useToast } from '../composables/useToast.js'
import {
  canvasToBlob,
  copyImage,
  downloadBlob,
  drawSpecCard,
  openBlob,
} from '../lib/exportImage.js'
import { fileSlug, formatDate, formatSize } from '../lib/files.js'
import { specsToText } from '../lib/specs.js'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const toast = useToast()
const { products, loading: loadingProducts, error: productError, selected } = useProductPicker()

const specs = ref([])
const documents = ref([])
const loading = ref(false)
const pageError = ref('')

const showUpload = ref(false)
const saving = ref(false)
const formErrors = ref({})
const formMessage = ref('')
const specImage = ref('') // data URL kartu spesifikasi

const canUpload = computed(() => auth.permissions.write_products === true)
const mainDoc = computed(() => documents.value.find((d) => d.kind === 'datasheet') ?? null)
const sourceText = computed(() =>
  mainDoc.value
    ? `Sumber: datasheet ${selected.value.sku} Rev. ${mainDoc.value.rev}`
    : `Sumber: data produk ${selected.value.sku}`,
)

const KIND_LABELS = { datasheet: 'Datasheet', guide: 'Panduan' }

watch(selected, async (product) => {
  specs.value = []
  documents.value = []
  showUpload.value = false
  specImage.value = ''
  pageError.value = ''
  if (!product) return
  loading.value = true
  try {
    const result = await api.getDatasheet(product.id)
    if (selected.value?.id !== product.id) return
    specs.value = result.specs
    documents.value = result.documents
  } catch (e) {
    pageError.value = e.message
  } finally {
    if (selected.value?.id === product.id) loading.value = false
  }
})

async function copySpecText() {
  const text = specsToText(selected.value, specs.value)
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
  toast.show('Ringkasan spesifikasi disalin')
}

function buildCard() {
  return drawSpecCard(selected.value, specs.value, sourceText.value)
}

function showSpecImage() {
  specImage.value = buildCard().toDataURL('image/png')
}

async function copySpecImage() {
  try {
    await copyImage(canvasToBlob(buildCard()))
    toast.show('Gambar spesifikasi disalin. Tempel dengan Ctrl+V')
  } catch {
    toast.show('Browser ini belum mengizinkan salin gambar. Gunakan Unduh PNG.', 'error', 3500)
  }
}

async function downloadSpecImage() {
  downloadBlob(await canvasToBlob(buildCard()), `spesifikasi-${fileSlug(selected.value.sku)}.png`)
}

async function fetchPdf(doc, action) {
  try {
    const blob = await api.downloadDatasheet(doc.id)
    if (action === 'open') openBlob(blob)
    else downloadBlob(blob, `${fileSlug(`${doc.title}-${selected.value.sku}`)}.pdf`)
  } catch (e) {
    toast.show(e.message, 'error', 3500)
  }
}

async function save(payload) {
  saving.value = true
  formErrors.value = {}
  formMessage.value = ''
  try {
    const created = await api.createDatasheetDoc(selected.value.id, payload)
    documents.value = [...documents.value, created]
    showUpload.value = false
    toast.show('Dokumen disimpan')
  } catch (e) {
    formErrors.value = e instanceof ApiError ? e.errors : {}
    formMessage.value = e.message
  } finally {
    saving.value = false
  }
}

async function remove(doc) {
  if (!window.confirm(`Hapus dokumen ini?\n\n${doc.title}`)) return
  try {
    await api.deleteDatasheetDoc(doc.id)
    documents.value = documents.value.filter((d) => d.id !== doc.id)
    toast.show('Dokumen dihapus')
  } catch (e) {
    toast.show(e.message, 'error', 3500)
  }
}
</script>

<template>
  <section class="search-page">
    <ProductHero
      v-model="selected"
      title="Datasheet produk"
      subtitle="Pilih produknya, lalu salin spesifikasinya atau unduh PDF resminya."
      :products="products"
      :loading="loadingProducts"
      :error="productError"
    />

    <p v-if="productError || pageError" class="alert alert-error" role="alert">
      <Icon name="info" :size="16" /> {{ productError || pageError }}
    </p>

    <div v-if="!selected && !loadingProducts" class="empty-state">
      <span class="empty-icon"><Icon name="file" :size="26" /></span>
      <p><strong>Belum ada produk dipilih</strong></p>
      <p class="muted">Mulai ketik SKU atau nama barang di kotak pencarian di atas.</p>
    </div>

    <template v-if="selected">
      <div class="card product-head">
        <span class="product-icon"><Icon name="box" :size="24" /></span>
        <div class="product-info">
          <span class="sku-chip">{{ selected.sku }}</span>
          <h2>{{ selected.name }}</h2>
          <p class="muted small">{{ documents.length }} dokumen PDF</p>
        </div>
        <button
          v-if="canUpload && !showUpload"
          type="button"
          class="btn btn-primary"
          @click="showUpload = true"
        >
          <Icon name="upload" :size="16" /> Unggah PDF
        </button>
      </div>

      <UploadPanel
        v-if="showUpload && canUpload"
        kind="datasheet"
        :saving="saving"
        :errors="formErrors"
        :message="formMessage"
        @save="save"
        @cancel="showUpload = false"
      />

      <div v-if="specImage" class="card upload">
        <div class="card-head">
          <h3>Gambar spesifikasi</h3>
          <button type="button" class="icon-btn" aria-label="Tutup" @click="specImage = ''">
            <Icon name="x" :size="18" />
          </button>
        </div>
        <div class="imgprev">
          <img :src="specImage" :alt="`Kartu spesifikasi ${selected.sku}`" />
        </div>
        <div class="actions">
          <button type="button" class="btn btn-primary" @click="copySpecImage">
            <Icon name="copy" :size="16" /> Salin gambar
          </button>
          <button type="button" class="btn" @click="downloadSpecImage">
            <Icon name="download" :size="16" /> Unduh PNG
          </button>
        </div>
        <p class="muted small">Siap ditempel (Ctrl+V) di WhatsApp Web, Telegram, atau email.</p>
      </div>

      <div v-if="loading" class="card skeleton" aria-busy="true"></div>

      <div v-else class="split split-sheet">
        <div class="card">
          <div class="card-head">
            <h3>Spesifikasi ringkas</h3>
            <div v-if="specs.length" class="actions">
              <button type="button" class="btn" @click="copySpecText">
                <Icon name="copy" :size="16" /> Salin teks
              </button>
              <button type="button" class="btn btn-primary" @click="showSpecImage">
                <Icon name="image" :size="16" /> Simpan sebagai gambar
              </button>
            </div>
          </div>
          <table v-if="specs.length" class="specs">
            <tbody>
              <tr v-for="[label, value] in specs" :key="label">
                <th scope="row">{{ label }}</th>
                <td>{{ value }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="muted">Spesifikasi belum diisi untuk produk ini.</p>
        </div>

        <div>
          <div class="card-head">
            <h3>{{ documents.length }} dokumen</h3>
          </div>
          <div v-if="!documents.length" class="empty-state">
            <span class="empty-icon"><Icon name="file" :size="26" /></span>
            <p><strong>Belum ada PDF untuk produk ini</strong></p>
            <p v-if="canUpload" class="muted">Klik "Unggah PDF" untuk menambahkan.</p>
          </div>
          <div v-else class="faq-list">
            <article v-for="doc in documents" :key="doc.id" class="card pdf">
              <div class="paper" aria-hidden="true">
                <i class="t"></i><i></i><i></i><i class="s"></i><i></i>
              </div>
              <div class="pdf-info">
                <h3>{{ doc.title }}</h3>
                <div class="doc-meta">
                  <span class="badge">PDF</span>
                  <span>{{ KIND_LABELS[doc.kind] ?? 'Dokumen' }}</span>
                  <span v-if="doc.pages">{{ doc.pages }} halaman</span>
                  <span>{{ formatSize(doc.size) }}</span>
                  <span>Rev. {{ doc.rev }}</span>
                  <span>{{ formatDate(doc.date) }}</span>
                </div>
                <div class="actions">
                  <button type="button" class="btn btn-primary" @click="fetchPdf(doc, 'open')">
                    <Icon name="external" :size="16" /> Buka PDF
                  </button>
                  <button type="button" class="btn" @click="fetchPdf(doc, 'download')">
                    <Icon name="download" :size="16" /> Unduh
                  </button>
                  <button
                    v-if="canUpload"
                    type="button"
                    class="btn btn-danger-text"
                    aria-label="Hapus dokumen"
                    @click="remove(doc)"
                  >
                    <Icon name="trash" :size="16" />
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>

      <p class="lock-note">
        <Icon name="lock" :size="14" /> Hanya untuk internal tim. Untuk dibagikan, unduh PDF-nya
        atau simpan spesifikasi sebagai gambar.
      </p>
    </template>
  </section>
</template>
