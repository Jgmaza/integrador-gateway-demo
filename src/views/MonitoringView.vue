<template>
  <v-container fluid class="pa-0">
    <GrafanaDashboard
      dashboard-uid="bLlNuRLWz"
      :height="'calc(100vh - 64px)'"
      theme="light"
      time-range="now-30m"
      refresh="5s"
      hide-controls
    />
  </v-container>
</template>

<script setup lang="ts">
import GrafanaDashboard from '@/components/GrafanaDashboard.vue';
</script>
