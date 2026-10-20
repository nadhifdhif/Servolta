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
    <header class="home-head">
      <h1>{{ greetingFor(new Date().getHours()) }}, {{ firstName(auth.user.name) }}</h1>
      <p class="muted">Pilih yang ingin dicari.</p>
    </header>

    <ul class="index">
      <li>
        <RouterLink :to="{ name: 'faq' }" class="index-row">
          <div>
            <h2>FAQ</h2>
            <p>Jawaban siap salin untuk membalas chat customer.</p>
            <p class="small">
              {{ canFaq ? 'Anda bisa menambah dan mengubah FAQ.' : 'Hanya lihat dan salin.' }}
            </p>
          </div>
          <span class="index-meta">
            <template v-if="overview"
              ><b>{{ overview.faq }}</b> FAQ · <b>{{ overview.products }}</b> produk</template
            >
          </span>
          <Icon name="arrow" :size="18" />
        </RouterLink>
      </li>
      <li>
        <RouterLink :to="{ name: 'wiring' }" class="index-row">
          <div>
            <h2>Wiring</h2>
            <p>Gambar pemasangan kabel per produk.</p>
            <p class="small">
              {{
                canFiles
                  ? 'Anda bisa mengunggah dan menghapus gambar.'
                  : 'Hanya lihat, salin, dan unduh.'
              }}
            </p>
          </div>
          <span class="index-meta">
            <template v-if="overview?.wiring != null"
              ><b>{{ overview.wiring }}</b> gambar</template
            >
          </span>
          <Icon name="arrow" :size="18" />
        </RouterLink>
      </li>
      <li>
        <RouterLink :to="{ name: 'datasheet' }" class="index-row">
          <div>
            <h2>Datasheet</h2>
            <p>Spesifikasi ringkas dan dokumen PDF.</p>
            <p class="small">
              {{
                canFiles
                  ? 'Anda bisa mengunggah dan menghapus PDF.'
                  : 'Hanya lihat, salin, dan unduh.'
              }}
            </p>
          </div>
          <span class="index-meta">
            <template v-if="overview?.datasheet != null"
              ><b>{{ overview.datasheet }}</b> PDF</template
            >
          </span>
          <Icon name="arrow" :size="18" />
        </RouterLink>
      </li>
    </ul>

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
