<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  role: { type: String, default: '' },
  size: { type: String, default: 'md' }, // 'md' | 'lg'
})

const initials = computed(() => {
  const words = props.name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return props.name.trim().slice(0, 2).toUpperCase()
})
</script>

<template>
  <span :class="['avatar', `avatar-${size}`]" :data-role="role" aria-hidden="true">{{
    initials
  }}</span>
</template>
