import { ref } from 'vue'

const toasts = ref([])
let nextId = 1

export function useToast() {
  function show(message, type = 'success', duration = 2200) {
    const id = nextId++
    toasts.value = [...toasts.value, { id, message, type }]
    setTimeout(() => {
      toasts.value = toasts.value.filter((toast) => toast.id !== id)
    }, duration)
  }

  return { toasts, show }
}
