<script setup>
import { ref, watch } from 'vue'
import { api, ApiError } from '../api'
import FaqForm from '../components/FaqForm.vue'
import Icon from '../components/Icon.vue'
import ProductHero from '../components/ProductHero.vue'
import { useProductPicker } from '../composables/useProductPicker.js'
import { useToast } from '../composables/useToast.js'

const toast = useToast()
const { products, loading, error, selected } = useProductPicker()

const formKey = ref(0) // mengganti key mengosongkan form
const saving = ref(false)
const errors = ref({})
const message = ref('')
const added = ref(0)

watch(selected, () => {
  formKey.value++
  added.value = 0
  errors.value = {}
  message.value = ''
})

async function save(payload) {
  saving.value = true
  errors.value = {}
  message.value = ''
  try {
    await api.createFaq(selected.value.id, payload)
    added.value++
    formKey.value++
    toast.show('FAQ disimpan')
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
      title="Tambah FAQ"
      subtitle="Pilih produknya, lalu tulis pertanyaan dan jawabannya. Form dikosongkan setelah disimpan, jadi bisa langsung menambah yang berikutnya."
      :products="products"
      :loading="loading"
      :error="error"
    />

    <p v-if="error" class="alert alert-error" role="alert">
      <Icon name="info" :size="16" /> {{ error }}
    </p>

    <div v-if="!selected && !loading" class="empty-state">
      <p><strong>Belum ada produk dipilih</strong></p>
      <p class="muted">Pilih produk dulu supaya FAQ-nya masuk ke tempat yang benar.</p>
    </div>

    <template v-if="selected">
      <div class="product-head">
        <div class="product-info">
          <span class="sku-chip">{{ selected.sku }}</span>
          <h2>{{ selected.name }}</h2>
        </div>
        <RouterLink :to="{ name: 'faq', query: { sku: selected.sku } }" class="btn">
          Lihat FAQ produk ini
        </RouterLink>
      </div>

      <p v-if="added" class="notice" role="status">
        <Icon name="check" :size="16" /> {{ added }} FAQ ditambahkan ke produk ini.
      </p>

      <FaqForm
        :key="formKey"
        :saving="saving"
        :errors="errors"
        :message="message"
        @save="save"
        @cancel="formKey++"
      />
    </template>
  </section>
</template>
