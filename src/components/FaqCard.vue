<script setup>
import { onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  faq: { type: Object, required: true },
  canWrite: { type: Boolean, default: false },
})
const emit = defineEmits(['edit', 'remove'])

const copied = ref(false)
let timer = null

async function copyAnswer() {
  try {
    await navigator.clipboard.writeText(props.faq.answer)
  } catch {
    // Cadangan untuk koneksi non-HTTPS atau izin clipboard ditolak.
    const area = document.createElement('textarea')
    area.value = props.faq.answer
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
  copied.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (copied.value = false), 1500)
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <article class="card faq-card">
    <header class="faq-head">
      <h3>{{ faq.question }}</h3>
      <span :class="['badge', faq.category === 'ts' ? 'badge-ts' : 'badge-cs']">
        {{ faq.category === 'ts' ? 'Technical Support' : 'Customer Service' }}
      </span>
    </header>
    <p class="faq-answer">{{ faq.answer }}</p>
    <footer class="actions">
      <button type="button" class="btn btn-primary" @click="copyAnswer">
        {{ copied ? 'Tersalin ✓' : 'Salin jawaban' }}
      </button>
      <template v-if="canWrite">
        <button type="button" class="btn btn-ghost" @click="emit('edit', faq)">Ubah</button>
        <button type="button" class="btn btn-danger" @click="emit('remove', faq)">Hapus</button>
      </template>
    </footer>
  </article>
</template>
