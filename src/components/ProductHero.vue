<script setup>
import ProductCombobox from './ProductCombobox.vue'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  products: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
const selected = defineModel({ type: Object, default: null })
</script>

<template>
  <header class="page-hero">
    <div>
      <h1>{{ title }}</h1>
      <p class="muted">{{ subtitle }}</p>
    </div>

    <p v-if="loading" class="hero-status">Memuat daftar produk...</p>
    <ProductCombobox v-else v-model="selected" :products="products" />
    <p v-if="!loading && !error" class="hero-status">{{ products.length }} produk terdaftar</p>
  </header>
</template>
