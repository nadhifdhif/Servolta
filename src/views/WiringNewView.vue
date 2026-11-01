<script setup>
import { ref, watch } from 'vue'
import { api, ApiError } from '../api'
import Icon from '../components/Icon.vue'
import ProductHero from '../components/ProductHero.vue'
import UploadPanel from '../components/UploadPanel.vue'
import { useProductPicker } from '../composables/useProductPicker.js'
import { useToast } from '../composables/useToast.js'

const toast = useToast()
const { products, loading, error, selected } = useProductPicker()

const formKey = ref(0)
const saving = ref(false)
const errors = ref({})
const message = ref('')
const added = ref([])

watch(selected, () => {
  formKey.value++
  added.value = []
  errors.value = {}
  message.value = ''
})

async function save(payload) {
  saving.value = true
  errors.value = {}
  message.value = ''
  try {
    const created = await api.createWiring(selected.value.id, payload)
    added.value = [...added.value, created]
    formKey.value++
    toast.show('Gambar wiring disimpan')
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
    <ProductHero
      v-model="selected"
      title="Tambah wiring"
      subtitle="Pilih produknya, lalu unggah gambar pemasangan kabel. Foto HEIC dari iPhone diubah otomatis ke JPG."
      :products="products"
      :loading="loading"
      :error="error"
    />

    <p v-if="error" class="alert alert-error" role="alert">
      <Icon name="info" :size="16" /> {{ error }}
    </p>

    <div v-if="!selected && !loading" class="empty-state">
      <p><strong>Belum ada produk dipilih</strong></p>
      <p class="muted">Pilih produk dulu supaya gambarnya masuk ke tempat yang benar.</p>
    </div>

    <template v-if="selected">
      <div class="product-head">
        <div class="product-info">
          <span class="sku-chip">{{ selected.sku }}</span>
          <h2>{{ selected.name }}</h2>
        </div>
        <RouterLink :to="{ name: 'wiring', query: { sku: selected.sku } }" class="btn">
          Lihat wiring produk ini
        </RouterLink>
      </div>

      <p v-if="added.length" class="notice" role="status">
        <Icon name="check" :size="16" />
        {{ added.length }} gambar ditambahkan: {{ added.map((d) => d.title).join(', ') }}.
      </p>

      <UploadPanel
        :key="formKey"
        kind="wiring"
        :saving="saving"
        :errors="errors"
        :message="message"
        @save="save"
        @cancel="formKey++"
      />
    </template>
  </section>
</template>
