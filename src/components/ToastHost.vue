<script setup>
import { useToast } from '../composables/useToast.js'
import Icon from './Icon.vue'

const { toasts } = useToast()
</script>

<template>
  <TransitionGroup name="toast" tag="div" class="toast-host" aria-live="polite">
    <div v-for="toast in toasts" :key="toast.id" :class="['toast', `toast-${toast.type}`]">
      <Icon :name="toast.type === 'error' ? 'info' : 'check'" :size="16" />
      {{ toast.message }}
    </div>
  </TransitionGroup>
</template>
