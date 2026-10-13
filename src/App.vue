<template>
  <v-app>
    <v-app-bar color="primary" elevation="2" app>
      <v-btn
        variant="text"
        class="text-none pa-2"
        height="auto"
        @click="goHome"
      >
        <v-icon class="mr-2" size="28">mdi-lan-connect</v-icon>
        <span class="font-weight-bold text-h6">Interop Gateway · Demo</span>
      </v-btn>

      <v-spacer></v-spacer>

      <v-btn to="/applications" variant="text" class="d-none d-md-flex">
        <v-icon start>mdi-apps</v-icon>
        Aplicaciones
      </v-btn>

      <v-chip class="ml-2 mr-2" size="small" variant="tonal" color="white">
        Portfolio · mock
      </v-chip>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <RouterView />
      </v-container>
    </v-main>

    <v-footer app class="text-caption text-medium-emphasis justify-center">
      Sanitized copy of the real admin UI. Fictional apps only — no institutional
      branding, hosts, or credentials.
    </v-footer>
  </v-app>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();
const goHome = () => router.push("/applications");
</script>
