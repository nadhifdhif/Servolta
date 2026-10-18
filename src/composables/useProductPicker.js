import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { useAuthStore } from '../stores/auth'
import { useRecent } from './useRecent.js'

// Memilih produk untuk menu Wiring / Datasheet. Produk terpilih dibawa lewat ?sku=,
// jadi berpindah menu tetap di produk yang sama dan tautannya bisa dibagikan antar rekan.
export function useProductPicker() {
  const auth = useAuthStore()
  const route = useRoute()
  const router = useRouter()
  const { add: addRecent } = useRecent(() => auth.user?.id)

  const products = ref([])
  const loading = ref(true)
  const error = ref('')
  const selected = ref(null)

  onMounted(async () => {
    try {
      products.value = await api.listProducts()
      const sku = route.query.sku
      if (typeof sku === 'string')
        selected.value = products.value.find((p) => p.sku === sku) ?? null
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  })

  watch(selected, (product) => {
    if (product) addRecent(product)
    router.replace({ query: product ? { sku: product.sku } : {} })
  })

  return { products, loading, error, selected }
}
