<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import Icon from '../components/Icon.vue'
import ProductCombobox from '../components/ProductCombobox.vue'
import { useRecent } from '../composables/useRecent.js'
import { firstName, greetingFor } from '../lib/greeting.js'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const { recent } = useRecent(() => auth.user?.id)

const overview = ref(null)
const products = ref([])
const picked = ref(null)

onMounted(async () => {
  // Angka ringkasan dan daftar produk hanya pelengkap; beranda tetap tampil bila gagal.
  const [summary, list] = await Promise.allSettled([api.getOverview(), api.listProducts()])
  overview.value = summary.status === 'fulfilled' ? summary.value : null
  products.value = list.status === 'fulfilled' ? list.value : []
})

// Pilih produk di kotak cari cepat -> langsung membuka FAQ produk itu.
watch(picked, (product) => {
  if (product) router.push({ name: 'faq', query: { sku: product.sku } })
})

const lookups = computed(() => [
  {
    to: 'faq',
    title: 'FAQ',
    text: 'Jawaban siap salin, plus saran upselling dan cross selling untuk tiap produk.',
  },
  {
    to: 'wiring',
    title: 'Wiring',
    text: 'Gambar pemasangan kabel per produk.',
  },
  {
    to: 'datasheet',
    title: 'Datasheet',
    text: 'Spesifikasi ringkas dan dokumen PDF.',
  },
  {
    to: 'snippets',
    title: 'Contoh kode',
    text: 'Arduino/ESP32 untuk DHT22, PZEM-004T, OLED 0.96", dan MPU6050.',
  },
])

const can = (perm) => auth.permissions[perm] === true

const additions = computed(() => [
  {
    to: 'faq-new',
    title: 'Tambah FAQ',
    text: 'Tulis pertanyaan dan jawaban untuk satu produk.',
    allowed: can('write_faq'),
    denied: 'Tidak tersedia untuk role Anda.',
  },
  {
    to: 'sku-new',
    title: 'Tambah SKU',
    text: 'Daftarkan produk baru beserta spesifikasinya.',
    allowed: can('write_products'),
    denied: 'Tidak tersedia untuk role Anda.',
  },
  {
    to: 'wiring-new',
    title: 'Tambah wiring',
    text: 'Unggah gambar pemasangan kabel (JPG, PNG, SVG, HEIC).',
    allowed: can('write_products'),
    denied: 'Tidak tersedia untuk role Anda.',
  },
  {
    to: 'users',
    title: 'Pengguna',
    text: 'Tambah akun dan atur role tim.',
    allowed: can('manage_users'),
    hidden: !can('manage_users'), // tidak ditampilkan sama sekali bagi yang tidak berhak
  },
])
</script>

<template>
  <section class="home">
    <header class="home-head">
      <div>
        <h1>{{ greetingFor(new Date().getHours()) }}, {{ firstName(auth.user.name) }}</h1>
        <p class="muted">Ketik SKU untuk langsung membuka FAQ-nya, atau pilih menu di bawah.</p>
      </div>
      <div class="home-search">
        <ProductCombobox v-model="picked" :products="products" />
      </div>
    </header>

    <dl v-if="overview" class="readout" aria-label="Ringkasan data">
      <div>
        <dt>FAQ</dt>
        <dd>{{ overview.faq }}</dd>
      </div>
      <div>
        <dt>Produk</dt>
        <dd>{{ overview.products }}</dd>
      </div>
      <div v-if="overview.wiring != null">
        <dt>Wiring</dt>
        <dd>{{ overview.wiring }}</dd>
      </div>
      <div v-if="overview.datasheet != null">
        <dt>Datasheet</dt>
        <dd>{{ overview.datasheet }}</dd>
      </div>
    </dl>

    <div class="home-columns">
      <section aria-labelledby="lookup-title">
        <h2 id="lookup-title" class="section-title">Cari dan salin</h2>
        <ul class="index">
          <li v-for="item in lookups" :key="item.to">
            <RouterLink :to="{ name: item.to }" class="index-row">
              <div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.text }}</p>
              </div>
              <Icon name="arrow" :size="18" />
            </RouterLink>
          </li>
        </ul>
      </section>

      <section aria-labelledby="add-title">
        <h2 id="add-title" class="section-title">Tambah data</h2>
        <ul class="index">
          <li v-for="item in additions.filter((i) => !i.hidden)" :key="item.to">
            <RouterLink v-if="item.allowed" :to="{ name: item.to }" class="index-row">
              <div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.text }}</p>
              </div>
              <Icon name="plus" :size="18" />
            </RouterLink>
            <div v-else class="index-row is-off" aria-disabled="true">
              <div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.denied }}</p>
              </div>
              <Icon name="lock" :size="16" />
            </div>
          </li>
        </ul>
      </section>
    </div>

    <section v-if="recent.length" aria-labelledby="recent-title">
      <h2 id="recent-title" class="section-title">Terakhir dilihat</h2>
      <ul class="recent-list">
        <li v-for="product in recent" :key="product.id">
          <RouterLink :to="{ name: 'faq', query: { sku: product.sku } }" class="recent-item">
            <span class="sku-chip">{{ product.sku }}</span>
            <span>{{ product.name }}</span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <p class="foot-note">
      Dokumen hanya untuk internal tim. Untuk dibagikan ke customer, unduh file atau simpan sebagai
      gambar.
    </p>
  </section>
</template>
