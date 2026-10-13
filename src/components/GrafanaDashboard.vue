<template>
  <v-card :loading="loading" :height="height">
    <v-card-title v-if="title">
      <v-icon start>mdi-chart-line</v-icon>
      {{ title }}
      <v-spacer></v-spacer>
      <v-btn
        :href="fullUrl"
        target="_blank"
        icon="mdi-open-in-new"
        size="small"
        variant="text"
      ></v-btn>
    </v-card-title>

    <v-card-text :class="{ 'pa-0': !title }">
      <iframe
        v-if="!error"
        :src="embedUrl"
        :style="{ width: '100%', height: iframeHeight, border: 'none' }"
        @load="loading = false"
        @error="handleError"
      ></iframe>

      <v-alert
        v-else
        type="error"
        variant="tonal"
        class="ma-4"
      >
        <v-alert-title>Error al cargar dashboard</v-alert-title>
        <div>{{ error }}</div>
        <div class="mt-2">
          <v-btn
            :href="fullUrl"
            target="_blank"
            variant="outlined"
            prepend-icon="mdi-open-in-new"
          >
            Abrir en nueva pestaña
          </v-btn>
        </div>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Props {
  // URL base de Grafana (ej: "http://localhost:3000")
  grafanaUrl?: string;
  // UID del dashboard (ej: "abc123xyz")
  dashboardUid: string;
  // Nombre del dashboard (para mostrar en header)
  title?: string;
  // Altura del componente
  height?: string | number;
  // Panel específico a mostrar (opcional)
  panelId?: number;
  // Variables del dashboard (ej: { var-datasource: "Prometheus" })
  variables?: Record<string, string>;
  // Rango de tiempo (ej: "now-6h", "now-24h")
  timeRange?: string;
  // Refrescar automáticamente (ej: "30s", "1m", "5m")
  refresh?: string;
  // Tema (light o dark)
  theme?: 'light' | 'dark';
  // Ocultar controles de Grafana
  hideControls?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  grafanaUrl: 'http://localhost:3000',
  height: '600px',
  theme: 'light',
  hideControls: false,
});

const loading = ref(true);
const error = ref('');

const embedUrl = computed(() => {
  const base = props.grafanaUrl;
  const path = `/d/${props.dashboardUid}`;
  
  const params = new URLSearchParams();
  
  // Tema
  params.set('theme', props.theme);
  
  // Kiosk mode (oculta controles)
  if (props.hideControls) {
    params.set('kiosk', '1');
  }
  
  // Panel específico
  if (props.panelId) {
    params.set('viewPanel', props.panelId.toString());
  }
  
  // Rango de tiempo
  if (props.timeRange) {
    params.set('from', props.timeRange);
    params.set('to', 'now');
  }
  
  // Refresh
  if (props.refresh) {
    params.set('refresh', props.refresh);
  }
  
  // Variables personalizadas
  if (props.variables) {
    Object.entries(props.variables).forEach(([key, value]) => {
      params.set(key, value);
    });
  }
  
  return `${base}${path}?${params.toString()}`;
});

const fullUrl = computed(() => {
  return embedUrl.value.replace(/[?&]kiosk=tv/, '');
});

const iframeHeight = computed(() => {
  if (props.title) {
    // Restar altura del header (aproximadamente 64px)
    const heightValue = typeof props.height === 'number' 
      ? props.height 
      : parseInt(props.height);
    return `${heightValue - 64}px`;
  }
  return typeof props.height === 'number' ? `${props.height}px` : props.height;
});

const handleError = () => {
  loading.value = false;
  error.value = 'No se pudo cargar el dashboard. Verifica que Grafana esté en ejecución y que el UID del dashboard sea correcto.';
};

onMounted(() => {
  // Timeout de seguridad por si el iframe no carga
  setTimeout(() => {
    if (loading.value) {
      handleError();
    }
  }, 10000);
});
</script>

<style scoped>
/* Asegurar que el iframe sea responsive */
iframe {
  display: block;
}
</style>
