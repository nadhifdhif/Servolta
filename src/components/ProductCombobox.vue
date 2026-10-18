<script setup>
import { computed, ref, watch } from 'vue'
import { searchProducts } from '../lib/search.js'
import Icon from './Icon.vue'

const props = defineProps({
  products: { type: Array, required: true },
  modelValue: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue'])

const query = ref('')
const open = ref(false)
const active = ref(0)
const inputEl = ref(null)

const label = (product) => `${product.sku} - ${product.name}`

const results = computed(() => searchProducts(props.products, query.value, { limit: 8 }))

// Tidak ada yang cocok -> tampilkan nama terdekat ("Maksud Anda ...").
const suggestions = computed(() => {
  if (results.value.length > 0 || query.value.trim().length < 3) return []
  return searchProducts(props.products, query.value, { limit: 3, loose: true })
})

const options = computed(() => (results.value.length > 0 ? results.value : suggestions.value))

watch(
  () => props.modelValue,
  (product) => {
    query.value = product ? label(product) : ''
  },
  { immediate: true },
)
watch(query, () => {
  active.value = 0
})

function choose(product) {
  emit('update:modelValue', product)
  query.value = label(product)
  open.value = false
}

function clear() {
  emit('update:modelValue', null)
  query.value = ''
  open.value = true
  inputEl.value?.focus()
}

function toggle() {
  open.value = !open.value
}

function onBlur() {
  open.value = false
  // Kembalikan teks ke produk yang sedang dipilih bila pengguna tidak jadi memilih yang lain.
  if (props.modelValue) query.value = label(props.modelValue)
}

function onKeydown(event) {
  const count = options.value.length
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    open.value = true
    if (count) active.value = (active.value + 1) % count
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    open.value = true
    if (count) active.value = (active.value - 1 + count) % count
  } else if (event.key === 'Enter') {
    if (open.value && options.value[active.value]) {
      event.preventDefault()
      choose(options.value[active.value].product)
    }
  } else if (event.key === 'Escape') {
    open.value = false
  }
}
</script>

<template>
  <div class="combobox">
    <label class="label label-on-hero" for="product-input">SKU atau nama barang</label>
    <div class="combobox-field">
      <span class="combobox-icon"><Icon name="search" :size="20" /></span>
      <input
        id="product-input"
        ref="inputEl"
        v-model="query"
        class="input input-hero"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        aria-controls="product-listbox"
        :aria-expanded="open"
        :aria-activedescendant="open && options.length ? `product-opt-${active}` : undefined"
        placeholder="Contoh: SVR-1000 atau stabilizer servo"
        @focus="open = true"
        @input="open = true"
        @blur="onBlur"
        @keydown="onKeydown"
      />
      <button
        v-if="modelValue"
        type="button"
        class="combobox-btn"
        aria-label="Kosongkan pilihan"
        @mousedown.prevent="clear"
      >
        <Icon name="x" :size="18" />
      </button>
      <button
        v-else
        type="button"
        class="combobox-btn"
        tabindex="-1"
        aria-label="Tampilkan daftar produk"
        @mousedown.prevent="toggle"
      >
        <Icon name="chevron" :size="18" />
      </button>
    </div>

    <ul v-if="open" id="product-listbox" class="listbox" role="listbox">
      <li v-if="suggestions.length" class="note" role="presentation">
        <Icon name="info" :size="14" /> Tidak ada yang persis. Maksud Anda salah satu dari ini?
      </li>
      <li
        v-for="(option, index) in options"
        :id="`product-opt-${index}`"
        :key="option.product.id"
        role="option"
        :aria-selected="index === active"
        :class="['option', { active: index === active }]"
        @mousedown.prevent="choose(option.product)"
        @mousemove="active = index"
      >
        <span class="sku-chip">{{ option.product.sku }}</span>
        <span class="option-name">{{ option.product.name }}</span>
        <span v-if="option.fuzzy" class="pill">mirip</span>
      </li>
      <li v-if="!options.length" class="option empty" role="presentation">
        Tidak ada produk yang cocok. Coba kata kunci lain.
      </li>
      <li v-if="options.length" class="listbox-hint" role="presentation">
        <kbd>&uarr;</kbd><kbd>&darr;</kbd> pilih &middot; <kbd>Enter</kbd> buka &middot;
        <kbd>Esc</kbd> tutup
      </li>
    </ul>
  </div>
</template>
