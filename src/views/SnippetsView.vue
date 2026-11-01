<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { copyText } from '../composables/useCopy.js'
import { useToast } from '../composables/useToast.js'
import { SNIPPETS, findSnippet } from '../data/snippets.js'
import { downloadBlob } from '../lib/exportImage.js'
import { fileSlug } from '../lib/files.js'
import { highlight } from '../lib/highlight.js'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const current = ref(findSnippet(String(route.query.s ?? '')) ?? SNIPPETS[0])
const html = computed(() => highlight(current.value.code))
const hasEsp = computed(() => current.value.boards.includes('ESP32'))
const hasUno = computed(() => current.value.boards.includes('Arduino Uno'))

function pick(snippet) {
  current.value = snippet
  router.replace({ query: { s: snippet.id } })
}

async function copy() {
  const ok = await copyText(current.value.code)
  toast.show(
    ok ? 'Kode disalin ke clipboard' : 'Tidak bisa menyalin. Blok dan salin manual.',
    ok ? 'success' : 'error',
  )
}

function download() {
  downloadBlob(
    new Blob([current.value.code], { type: 'text/plain' }),
    `${fileSlug(current.value.id)}.ino`,
  )
}
</script>

<template>
  <section class="search-page">
    <header class="page-hero">
      <div>
        <h1>Contoh kode sensor</h1>
        <p class="muted">
          Kode untuk Arduino IDE (ESP32 dan Arduino Uno). Salin, tempel, lalu sesuaikan nomor pin.
        </p>
      </div>
    </header>

    <div class="split">
      <div class="doc-list" role="tablist" aria-label="Contoh kode">
        <button
          v-for="snippet in SNIPPETS"
          :key="snippet.id"
          type="button"
          role="tab"
          :aria-selected="snippet === current"
          :class="['doc', { active: snippet === current }]"
          @click="pick(snippet)"
        >
          <strong>{{ snippet.name }}</strong>
          <span class="doc-meta">{{ snippet.kind }}</span>
        </button>
      </div>

      <article class="card snippet">
        <header class="snippet-head">
          <div>
            <h2>{{ current.name }}</h2>
            <p class="muted">{{ current.summary }}</p>
          </div>
          <div class="chips">
            <span v-for="board in current.boards" :key="board" class="badge">{{ board }}</span>
          </div>
        </header>

        <div v-for="warning in current.warnings" :key="warning" class="warn">
          <Icon name="info" :size="18" /><span>{{ warning }}</span>
        </div>

        <h3 class="sub-title">Pustaka</h3>
        <p class="muted small">
          Arduino IDE: Sketch &rarr; Include Library &rarr; Manage Libraries, lalu cari:
        </p>
        <ul class="lib-list">
          <li v-for="lib in current.libraries" :key="lib.name">
            <strong>{{ lib.name }}</strong> <span class="muted">oleh {{ lib.by }}</span>
          </li>
        </ul>

        <h3 class="sub-title">Pengkabelan</h3>
        <div class="table-wrap">
          <table class="specs wiring-table">
            <thead>
              <tr>
                <th scope="col">Pin sensor</th>
                <th v-if="hasEsp" scope="col">ESP32</th>
                <th v-if="hasUno" scope="col">Arduino Uno</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in current.wiring" :key="row.pin">
                <th scope="row">{{ row.pin }}</th>
                <td v-if="hasEsp">{{ row.esp32 }}</td>
                <td v-if="hasUno">{{ row.uno }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul v-if="current.notes.length" class="note-list">
          <li v-for="note in current.notes" :key="note">{{ note }}</li>
        </ul>

        <div class="code-head">
          <span class="code-name">{{ fileSlug(current.id) }}.ino</span>
          <div class="actions">
            <button type="button" class="btn btn-primary" @click="copy">
              <Icon name="copy" :size="16" /> Salin kode
            </button>
            <button type="button" class="btn" @click="download">
              <Icon name="download" :size="16" /> Unduh .ino
            </button>
          </div>
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <pre class="code" tabindex="0"><code v-html="html"></code></pre>
      </article>
    </div>
  </section>
</template>
