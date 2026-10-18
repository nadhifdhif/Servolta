<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '../api'
import Icon from '../components/Icon.vue'
import { useRecent } from '../composables/useRecent.js'
import { firstName, greetingFor } from '../lib/greeting.js'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const { recent } = useRecent(() => auth.user?.id)

const overview = ref(null)
const canFaq = computed(() => auth.permissions.write_faq === true)
const canFiles = computed(() => auth.permissions.write_products === true)

onMounted(async () => {
  try {
    overview.value = await api.getOverview()
  } catch {
    overview.value = null // angka ringkasan hanya pelengkap; beranda tetap tampil
  }
})
</script>

<template>
  <section class="home">
    <header class="greet">
      <p class="eyebrow">{{ greetingFor(new Date().getHours()) }}</p>
      <h1>Halo, {{ firstName(auth.user.name) }}. Mau lihat apa?</h1>
      <p class="greet-text">
        Pilih jenis informasi yang Anda butuhkan untuk membalas customer. Produknya dipilih setelah
        menu dibuka.
      </p>
    </header>

    <div class="menus">
      <RouterLink :to="{ name: 'faq' }" class="menu-card faq">
        <span class="tile"><Icon name="message" :size="28" /></span>
        <div>
          <h2>FAQ</h2>
          <p class="tagline">
            Jawaban siap salin untuk membalas chat customer, dikelompokkan CS dan teknis.
          </p>
        </div>
        <div class="motif" aria-hidden="true">
          <svg viewBox="0 0 220 56" width="100%" height="56">
            <rect
              x="0"
              y="4"
              width="120"
              height="20"
              rx="10"
              fill="var(--surface)"
              stroke="var(--border-strong)"
            />
            <rect x="14" y="12" width="64" height="4" rx="2" fill="var(--border-strong)" />
            <rect x="92" y="32" width="128" height="20" rx="10" fill="var(--m-faq)" />
            <rect x="108" y="40" width="80" height="4" rx="2" fill="#fff" opacity=".85" />
          </svg>
        </div>
        <ul class="stats">
          <template v-if="overview">
            <li>
              <b>{{ overview.faq }}</b> FAQ
            </li>
            <li>
              <b>{{ overview.products }}</b> produk
            </li>
          </template>
          <li v-else>Cari lewat SKU atau nama barang</li>
        </ul>
        <span :class="['role-note', { can: canFaq }]">
          <Icon :name="canFaq ? 'edit' : 'eye'" :size="14" />
          {{ canFaq ? 'Anda bisa menambah dan mengubah FAQ' : 'Hanya melihat' }}
        </span>
        <span class="cta">Buka FAQ <Icon name="arrow" :size="18" /></span>
      </RouterLink>

      <RouterLink :to="{ name: 'wiring' }" class="menu-card wir">
        <span class="tile"><Icon name="plug" :size="28" /></span>
        <div>
          <h2>Wiring</h2>
          <p class="tagline">
            Gambar pemasangan kabel per produk, bisa disalin atau diunduh untuk dikirim.
          </p>
        </div>
        <div class="motif" aria-hidden="true">
          <svg viewBox="0 0 220 56" width="100%" height="56">
            <rect
              x="0"
              y="14"
              width="44"
              height="28"
              rx="8"
              fill="var(--surface)"
              stroke="var(--border-strong)"
            />
            <rect
              x="176"
              y="14"
              width="44"
              height="28"
              rx="8"
              fill="var(--surface)"
              stroke="var(--border-strong)"
            />
            <line
              x1="44"
              y1="21"
              x2="176"
              y2="21"
              stroke="var(--wire-l)"
              stroke-width="4"
              stroke-linecap="round"
            />
            <line
              x1="44"
              y1="28"
              x2="176"
              y2="28"
              stroke="var(--wire-n)"
              stroke-width="4"
              stroke-linecap="round"
            />
            <line
              x1="44"
              y1="35"
              x2="176"
              y2="35"
              stroke="var(--wire-pe)"
              stroke-width="4"
              stroke-linecap="round"
            />
            <line
              x1="44"
              y1="35"
              x2="176"
              y2="35"
              stroke="var(--wire-pe2)"
              stroke-width="4"
              stroke-dasharray="7 7"
            />
          </svg>
        </div>
        <ul class="stats">
          <li>JPG, PNG, SVG, HEIC</li>
        </ul>
        <span :class="['role-note', { can: canFiles }]">
          <Icon :name="canFiles ? 'upload' : 'eye'" :size="14" />
          {{ canFiles ? 'Anda bisa mengunggah gambar' : 'Hanya melihat dan menyalin' }}
        </span>
        <span class="cta">Buka Wiring <Icon name="arrow" :size="18" /></span>
      </RouterLink>

      <RouterLink :to="{ name: 'datasheet' }" class="menu-card ds">
        <span class="tile"><Icon name="file" :size="28" /></span>
        <div>
          <h2>Datasheet</h2>
          <p class="tagline">
            Spesifikasi ringkas dan dokumen PDF resmi, bisa disalin sebagai teks atau gambar.
          </p>
        </div>
        <div class="motif" aria-hidden="true">
          <svg viewBox="0 0 220 56" width="100%" height="56">
            <rect
              x="0"
              y="2"
              width="220"
              height="52"
              rx="8"
              fill="var(--surface)"
              stroke="var(--border-strong)"
            />
            <rect x="12" y="11" width="60" height="5" rx="2.5" fill="var(--m-ds)" />
            <rect x="12" y="24" width="48" height="4" rx="2" fill="var(--border-strong)" />
            <rect x="110" y="24" width="86" height="4" rx="2" fill="var(--border-strong)" />
            <rect x="12" y="36" width="56" height="4" rx="2" fill="var(--border-strong)" />
            <rect x="110" y="36" width="70" height="4" rx="2" fill="var(--border-strong)" />
          </svg>
        </div>
        <ul class="stats">
          <li>PDF dan spesifikasi 1 klik</li>
        </ul>
        <span :class="['role-note', { can: canFiles }]">
          <Icon :name="canFiles ? 'upload' : 'eye'" :size="14" />
          {{ canFiles ? 'Anda bisa mengunggah PDF' : 'Hanya melihat dan menyalin' }}
        </span>
        <span class="cta">Buka Datasheet <Icon name="arrow" :size="18" /></span>
      </RouterLink>
    </div>

    <section v-if="recent.length" class="recent" aria-labelledby="recent-title">
      <h2 id="recent-title">Terakhir Anda lihat</h2>
      <div class="recent-list">
        <RouterLink
          v-for="product in recent"
          :key="product.id"
          :to="{ name: 'faq', query: { sku: product.sku } }"
          class="recent-item"
        >
          <span class="sku-chip">{{ product.sku }}</span>
          <strong :title="product.name">{{ product.name }}</strong>
          <span class="muted small">Buka FAQ <Icon name="arrow" :size="14" /></span>
        </RouterLink>
      </div>
    </section>

    <p class="foot-note">
      Semua dokumen hanya untuk internal tim. Untuk dibagikan ke customer, unduh file atau simpan
      sebagai gambar.
    </p>
  </section>
</template>
