<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { api, ApiError } from '../api'
import Icon from '../components/Icon.vue'
import ProductHero from '../components/ProductHero.vue'
import UploadPanel from '../components/UploadPanel.vue'
import { useProductPicker } from '../composables/useProductPicker.js'
import { useToast } from '../composables/useToast.js'
import { diagramSvg, usedWires } from '../lib/diagram.js'
import { blobToPngBlob, copyImage, downloadBlob, svgToPngBlob } from '../lib/exportImage.js'
import { fileSlug, formatDate, formatSize } from '../lib/files.js'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const toast = useToast()
const { products, loading: loadingProducts, error: productError, selected } = useProductPicker()

const docs = ref([])
const loading = ref(false)
const pageError = ref('')
const index = ref(0)
const zoom = ref(1)

const showUpload = ref(false)
const saving = ref(false)
const formErrors = ref({})
const formMessage = ref('')

const imageUrl = ref('')
const imageBlob = ref(null)
const imageLoading = ref(false)

const canUpload = computed(() => auth.permissions.write_products === true)
const current = computed(() => docs.value[Math.min(index.value, docs.value.length - 1)] ?? null)
const svg = computed(() =>
  current.value?.kind === 'diagram' ? diagramSvg(current.value.diagram, current.value.title) : '',
)
const legend = computed(() =>
  current.value?.kind === 'diagram' ? usedWires(current.value.diagram) : [],
)

function clearImage() {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = ''
  imageBlob.value = null
}
onBeforeUnmount(clearImage)

watch(selected, async (product) => {
  docs.value = []
  index.value = 0
  zoom.value = 1
  showUpload.value = false
  pageError.value = ''
  clearImage()
  if (!product) return
  loading.value = true
  try {
    const result = await api.listWiring(product.id)
    if (selected.value?.id === product.id) docs.value = result
  } catch (e) {
    pageError.value = e.message
  } finally {
    if (selected.value?.id === product.id) loading.value = false
  }
})

// Gambar unggahan diambil dengan token (tag <img> tidak bisa mengirim header Authorization).
watch(current, async (doc) => {
  clearImage()
  zoom.value = 1
  if (!doc || doc.kind !== 'image' || doc.previewable === false) return
  imageLoading.value = true
  try {
    const blob = await api.getWiringImage(doc.id)
    if (current.value?.id !== doc.id) return
    imageBlob.value = blob
    imageUrl.value = URL.createObjectURL(blob)
  } catch (e) {
    pageError.value = e.message
  } finally {
    if (current.value?.id === doc.id) imageLoading.value = false
  }
})

function changeZoom(step) {
  zoom.value = Math.min(2, Math.max(0.6, Number((zoom.value + 0.2 * step).toFixed(1))))
}

async function pngBlob() {
  if (current.value.kind === 'diagram') return svgToPngBlob(svg.value)
  if (!imageBlob.value) throw new Error('Gambar belum tersedia')
  return blobToPngBlob(imageBlob.value)
}

async function copyCurrent() {
  try {
    await copyImage(pngBlob())
    toast.show('Gambar wiring disalin. Tempel dengan Ctrl+V')
  } catch {
    toast.show('Browser ini belum mengizinkan salin gambar. Gunakan Unduh.', 'error', 3500)
  }
}

async function downloadCurrent() {
  const base = `wiring-${fileSlug(selected.value.sku)}-${fileSlug(current.value.title)}`
  try {
    if (current.value.kind === 'image' && imageBlob.value) {
      const ext = (current.value.format || 'png').toLowerCase()
      downloadBlob(imageBlob.value, `${base}.${ext}`)
    } else {
      downloadBlob(await pngBlob(), `${base}.png`)
    }
  } catch {
    toast.show('Gambar tidak dapat diunduh.', 'error', 3500)
  }
}

async function save(payload) {
  saving.value = true
  formErrors.value = {}
  formMessage.value = ''
  try {
    const created = await api.createWiring(selected.value.id, payload)
    docs.value = [...docs.value, created]
    index.value = docs.value.length - 1
    showUpload.value = false
    toast.show('Gambar wiring disimpan')
  } catch (e) {
    formErrors.value = e instanceof ApiError ? e.errors : {}
    formMessage.value = e.message
  } finally {
    saving.value = false
  }
}

async function remove() {
  const doc = current.value
  if (!window.confirm(`Hapus dokumen wiring ini?\n\n${doc.title}`)) return
  try {
    await api.deleteWiring(doc.id)
    docs.value = docs.value.filter((d) => d.id !== doc.id)
    index.value = 0
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
      title="Wiring"
      subtitle="Gambar pemasangan kabel per produk. Salin atau unduh untuk dikirim ke customer."
      :products="products"
      :loading="loadingProducts"
      :error="productError"
    />

    <p v-if="productError || pageError" class="alert alert-error" role="alert">
      <Icon name="info" :size="16" /> {{ productError || pageError }}
    </p>

    <div v-if="!selected && !loadingProducts" class="empty-state">
      <p><strong>Belum ada produk dipilih</strong></p>
      <p class="muted">Mulai ketik SKU atau nama barang di kotak pencarian di atas.</p>
    </div>

    <template v-if="selected">
      <div class="card product-head">
        <div class="product-info">
          <span class="sku-chip">{{ selected.sku }}</span>
          <h2>{{ selected.name }}</h2>
          <p class="muted small">{{ docs.length }} dokumen wiring</p>
        </div>
        <button
          v-if="canUpload && !showUpload"
          type="button"
          class="btn btn-primary"
          @click="showUpload = true"
        >
          <Icon name="upload" :size="16" /> Unggah
        </button>
      </div>

      <UploadPanel
        v-if="showUpload && canUpload"
        kind="wiring"
        :saving="saving"
        :errors="formErrors"
        :message="formMessage"
        @save="save"
        @cancel="showUpload = false"
      />

      <div v-if="loading" class="card skeleton" aria-busy="true"></div>

      <div v-else-if="!docs.length" class="empty-state">
        <p><strong>Belum ada gambar wiring untuk produk ini</strong></p>
        <p v-if="canUpload" class="muted">Klik "Unggah" untuk menambahkan yang pertama.</p>
      </div>

      <div v-else-if="current" class="split">
        <div class="doc-list" role="tablist" aria-label="Dokumen wiring">
          <button
            v-for="(doc, i) in docs"
            :key="doc.id"
            type="button"
            role="tab"
            :aria-selected="doc === current"
            :class="['doc', { active: doc === current }]"
            @click="index = i"
          >
            <strong>{{ doc.title }}</strong>
            <span class="doc-meta">
              <span class="badge">{{ doc.format }}</span>
              <span>Rev. {{ doc.rev }}</span>
              <span>{{ formatDate(doc.date) }}</span>
            </span>
          </button>
        </div>

        <div class="card viewer">
          <div class="viewer-head">
            <div>
              <h3>{{ current.title }}</h3>
              <p class="muted small">
                {{ selected.sku }} · Rev. {{ current.rev }} · diperbarui
                {{ formatDate(current.date) }}
              </p>
            </div>
            <div class="zoom">
              <button type="button" class="icon-btn" aria-label="Perkecil" @click="changeZoom(-1)">
                <Icon name="zoom-out" :size="18" />
              </button>
              <span>{{ Math.round(zoom * 100) }}%</span>
              <button type="button" class="icon-btn" aria-label="Perbesar" @click="changeZoom(1)">
                <Icon name="zoom-in" :size="18" />
              </button>
            </div>
          </div>

          <div class="canvas" :style="{ '--zoom': zoom }">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="svg" class="canvas-svg" v-html="svg"></div>
            <img
              v-else-if="imageUrl"
              :src="imageUrl"
              :alt="`Gambar wiring ${current.title}`"
              class="canvas-img"
            />
            <p v-else-if="imageLoading" class="muted">Memuat gambar...</p>
            <p v-else class="muted canvas-note">
              <Icon name="image" :size="22" />
              Pratinjau belum tersedia untuk format ini. Gambar tetap bisa diunduh setelah server
              mengubahnya ke JPG.
            </p>
          </div>

          <div class="fileinfo">
            <span class="badge">{{ current.format }}</span>
            <span v-if="current.dimensions">{{ current.dimensions }}</span>
            <span>{{ formatSize(current.size) }}</span>
            <span v-if="current.note" class="fi-note">
              <Icon name="info" :size="14" /> {{ current.note }}
            </span>
          </div>

          <template v-if="current.kind === 'diagram'">
            <ul class="legend">
              <li v-for="wire in legend" :key="wire.key">
                <i :style="{ background: wire.color }"></i>{{ wire.label }}
              </li>
            </ul>
            <ol class="steps">
              <li v-for="step in current.diagram.steps" :key="step">{{ step }}</li>
            </ol>
            <div class="warn">
              <Icon name="info" :size="18" /><span>{{ current.diagram.warn }}</span>
            </div>
          </template>

          <div class="actions">
            <button
              type="button"
              class="btn btn-primary"
              :disabled="current.kind === 'image' && !imageBlob"
              @click="copyCurrent"
            >
              <Icon name="copy" :size="16" /> Salin gambar
            </button>
            <button
              type="button"
              class="btn"
              :disabled="current.kind === 'image' && !imageBlob"
              @click="downloadCurrent"
            >
              <Icon name="download" :size="16" /> Unduh gambar
            </button>
            <button
              v-if="canUpload"
              type="button"
              class="btn btn-danger-text"
              aria-label="Hapus dokumen"
              @click="remove"
            >
              <Icon name="trash" :size="16" /> <span class="hide-sm">Hapus</span>
            </button>
          </div>
        </div>
      </div>

      <p v-if="docs.length" class="lock-note">
        <Icon name="lock" :size="14" /> Hanya untuk internal tim. Untuk dibagikan ke customer, unduh
        gambarnya atau salin lalu tempel di chat.
      </p>
    </template>
  </section>
</template>
