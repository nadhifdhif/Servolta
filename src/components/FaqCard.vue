<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useToast } from '../composables/useToast.js'
import Icon from './Icon.vue'

const props = defineProps({
  faq: { type: Object, required: true },
  canWrite: { type: Boolean, default: false },
})
const emit = defineEmits(['edit', 'remove'])

const toast = useToast()
const copied = ref(false)
let timer = null

const updated = computed(() => {
  const date = new Date(props.faq.updated_at)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
})

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
  toast.show('Jawaban disalin ke clipboard')
  clearTimeout(timer)
  timer = setTimeout(() => (copied.value = false), 1500)
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <article :class="['card', 'faq-card', `faq-${faq.category}`]">
    <header class="faq-head">
      <h3>{{ faq.question }}</h3>
      <span :class="['badge', faq.category === 'ts' ? 'badge-ts' : 'badge-cs']">
        {{ faq.category === 'ts' ? 'Technical Support' : 'Customer Service' }}
      </span>
    </header>

    <p class="faq-answer">{{ faq.answer }}</p>

    <footer class="faq-foot">
      <span v-if="updated" class="muted small">Diperbarui {{ updated }}</span>
      <div class="actions">
        <button type="button" class="btn btn-primary" @click="copyAnswer">
          <Icon :name="copied ? 'check' : 'copy'" :size="16" />
          {{ copied ? 'Tersalin' : 'Salin jawaban' }}
        </button>
        <template v-if="canWrite">
          <button type="button" class="btn btn-ghost" @click="emit('edit', faq)">
            <Icon name="edit" :size="16" /> <span class="hide-sm">Ubah</span>
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-danger-text"
            aria-label="Hapus FAQ"
            @click="emit('remove', faq)"
          >
            <Icon name="trash" :size="16" /> <span class="hide-sm">Hapus</span>
          </button>
        </template>
      </div>
    </footer>
  </article>
</template>
