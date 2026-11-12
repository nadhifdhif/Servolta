<script setup>
import { isMock } from './api'
import AppHeader from './components/AppHeader.vue'
import ToastHost from './components/ToastHost.vue'
</script>

<template>
  <div v-if="isMock" class="mock-ribbon" role="status">
    Mode contoh: data tersimpan di browser ini, bukan di server.
  </div>
  <AppHeader />
  <main class="container page">
    <RouterView />
  </main>
  <ToastHost />
</template>
