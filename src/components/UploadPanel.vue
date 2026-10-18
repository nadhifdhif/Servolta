<script setup>
import { computed, ref } from 'vue'
import { validateUpload } from '../lib/files.js'
import Icon from './Icon.vue'

const props = defineProps({
  kind: { type: String, required: true }, // 'wiring' | 'datasheet'
  saving: { type: Boolean, default: false },
  errors: { type: Object, default: () => ({}) },
  message: { type: String, default: '' },
})
const emit = defineEmits(['save', 'cancel'])

const isWiring = computed(() => props.kind === 'wiring')
const title = ref('')
const rev = ref('')
const file = ref(null)
const localError = ref('')
const dragging = ref(false)
const inputEl = ref(null)

const accept = computed(() =>
  isWiring.value ? 'image/*,.heic,.heif,.svg' : 'application/pdf,.pdf',
)
const fileError = computed(() => localError.value || props.errors.file?.[0] || '')

function pick(candidate) {
  localError.value = validateUpload(props.kind, candidate) ?? ''
  file.value = localError.value ? null : candidate
  if (file.value && !title.value.trim()) title.value = candidate.name.replace(/\.[^.]+$/, '')
}

function onDrop(event) {
  dragging.value = false
  const dropped = event.dataTransfer?.files?.[0]
  if (dropped) pick(dropped)
}

function submit() {
  if (!file.value || !title.value.trim()) return
  emit('save', { title: title.value.trim(), rev: rev.value.trim(), file: file.value })
}
</script>

<template>
  <form class="card upload" novalidate @submit.prevent="submit">
    <div class="card-head">
      <h3>{{ isWiring ? 'Unggah gambar wiring' : 'Unggah datasheet (PDF)' }}</h3>
      <button type="button" class="icon-btn" aria-label="Tutup" @click="emit('cancel')">
        <Icon name="x" :size="18" />
      </button>
    </div>

    <p v-if="message && !Object.keys(errors).length" class="alert alert-error" role="alert">
      <Icon name="info" :size="16" /> {{ message }}
    </p>

    <div
      :class="['dropzone', { over: dragging, bad: fileError }]"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <Icon name="upload" :size="26" />
      <b v-if="file">{{ file.name }}</b>
      <b v-else>Tarik file ke sini atau pilih dari komputer</b>
      <span class="small">
        {{
          isWiring
            ? 'JPG, PNG, WebP, GIF, SVG, HEIC (foto iPhone), dan format foto lain · maks. 15 MB'
            : 'PDF saja · maks. 20 MB'
        }}
      </span>
      <span v-if="isWiring" class="small">
        HEIC akan diubah otomatis ke JPG dan data lokasi pada foto dihapus oleh server.
      </span>
      <button type="button" class="btn" @click="inputEl.click()">Pilih file</button>
      <input
        ref="inputEl"
        type="file"
        class="sr-only"
        :accept="accept"
        @change="pick($event.target.files[0])"
      />
    </div>
    <p v-if="fileError" class="field-error" role="alert">{{ fileError }}</p>

    <div class="upload-grid">
      <div class="field">
        <label class="label" for="up-title">Judul</label>
        <input
          id="up-title"
          v-model="title"
          class="input"
          :placeholder="isWiring ? 'Mis. Instalasi dengan MCB terpisah' : 'Mis. Datasheet (EN)'"
        />
        <p v-if="errors.title" class="field-error">{{ errors.title[0] }}</p>
      </div>
      <div class="field">
        <label class="label" for="up-rev">Revisi</label>
        <input id="up-rev" v-model="rev" class="input" placeholder="Mis. 4" />
      </div>
    </div>

    <div class="actions">
      <button type="submit" class="btn btn-primary" :disabled="saving || !file || !title.trim()">
        <Icon name="upload" :size="16" /> {{ saving ? 'Menyimpan...' : 'Simpan' }}
      </button>
      <button type="button" class="btn" @click="emit('cancel')">Batal</button>
    </div>
  </form>
</template>
