<script setup>
import { reactive } from 'vue'

const props = defineProps({
  initial: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  errors: { type: Object, default: () => ({}) },
  message: { type: String, default: '' },
})
const emit = defineEmits(['save', 'cancel'])

const form = reactive({
  category: props.initial?.category ?? 'cs',
  question: props.initial?.question ?? '',
  answer: props.initial?.answer ?? '',
})

function submit() {
  emit('save', { category: form.category, question: form.question, answer: form.answer })
}
</script>

<template>
  <form class="card faq-form" @submit.prevent="submit">
    <h3>{{ initial ? 'Ubah FAQ' : 'Tambah FAQ' }}</h3>

    <p v-if="message" class="alert alert-error" role="alert">{{ message }}</p>

    <div class="field">
      <label class="label" for="faq-category">Kategori</label>
      <select id="faq-category" v-model="form.category" class="input">
        <option value="cs">Customer Service</option>
        <option value="ts">Technical Support</option>
      </select>
      <p v-if="errors.category" class="field-error">{{ errors.category[0] }}</p>
    </div>

    <div class="field">
      <label class="label" for="faq-question">Pertanyaan</label>
      <input id="faq-question" v-model="form.question" class="input" type="text" required />
      <p v-if="errors.question" class="field-error">{{ errors.question[0] }}</p>
    </div>

    <div class="field">
      <label class="label" for="faq-answer">Jawaban</label>
      <textarea id="faq-answer" v-model="form.answer" class="input" rows="5" required></textarea>
      <p v-if="errors.answer" class="field-error">{{ errors.answer[0] }}</p>
    </div>

    <div class="actions">
      <button type="submit" class="btn btn-primary" :disabled="saving">
        {{ saving ? 'Menyimpan...' : 'Simpan' }}
      </button>
      <button type="button" class="btn btn-ghost" :disabled="saving" @click="emit('cancel')">Batal</button>
    </div>
  </form>
</template>
