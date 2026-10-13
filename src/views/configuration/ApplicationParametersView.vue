<template>
  <v-container fluid>
    <v-card elevation="2" rounded="lg">
      <v-card-title class="d-flex align-center pa-6">
        <v-icon color="success" size="32" class="mr-3">mdi-tune</v-icon>
        <span class="text-h5 font-weight-bold">Parámetros de Aplicaciones</span>
      </v-card-title>
      <v-divider></v-divider>

      <v-card-text class="pa-4">
        <v-row>
          <v-col cols="12" md="6">
            <v-select
              v-model="selectedApplicationId"
              :items="applications"
              item-title="name"
              item-value="id"
              label="Aplicación"
              prepend-inner-icon="mdi-apps"
              variant="outlined"
              clearable
              @update:model-value="loadParameters"
            />
          </v-col>
        </v-row>

        <v-row v-if="selectedApplicationId">
          <v-col cols="12" md="6">
            <v-select
              v-model="form.auth_type"
              :items="['none', 'basic', 'bearer', 'soap', 'custom_headers']"
              label="Tipo de autenticación"
              prepend-inner-icon="mdi-lock-outline"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.auth_username"
              label="Usuario"
              prepend-inner-icon="mdi-account"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.auth_password"
              label="Contraseña"
              type="password"
              prepend-inner-icon="mdi-lock"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12">
            <v-textarea
              v-model="authConfigJson"
              label="auth_config (JSON)"
              variant="outlined"
              rows="4"
            />
          </v-col>
          <v-col cols="12">
            <h3 class="text-subtitle-1 font-weight-bold mb-3">
              <v-icon size="20" class="mr-1">mdi-format-header-1</v-icon>
              Flujo de Headers (catálogo -> valor)
            </h3>
            <v-card variant="outlined" class="pa-4">
              <v-row
                v-for="(row, index) in headerRows"
                :key="index"
                class="align-center"
              >
                <v-col cols="12" md="5">
                  <v-select
                    v-model="row.key"
                    :items="headerCatalogNames"
                    label="Header"
                    variant="outlined"
                    density="compact"
                    clearable
                    :disabled="!authStore.canPerform('APPLICATIONS', 'update')"
                  />
                </v-col>
                <v-col cols="12" md="5">
                  <v-text-field
                    v-model="row.value"
                    label="Valor"
                    variant="outlined"
                    density="compact"
                    :disabled="!authStore.canPerform('APPLICATIONS', 'update')"
                  />
                </v-col>
                <v-col cols="12" md="2" class="d-flex justify-end">
                  <v-btn
                    icon="mdi-delete"
                    size="small"
                    color="error"
                    variant="text"
                    :disabled="!authStore.canPerform('APPLICATIONS', 'update')"
                    @click="removeHeaderRow(index)"
                  />
                </v-col>
              </v-row>

              <v-btn
                prepend-icon="mdi-plus"
                variant="text"
                color="primary"
                :disabled="!authStore.canPerform('APPLICATIONS', 'update')"
                @click="addHeaderRow"
              >
                Agregar Header
              </v-btn>
            </v-card>
          </v-col>
          <v-col cols="12">
            <v-textarea
              v-model="headersJson"
              label="headers_globales (JSON)"
              variant="outlined"
              rows="4"
            />
          </v-col>
          <v-col cols="12">
            <v-textarea
              v-model="pluginsJson"
              label="plugins_apisix (JSON)"
              variant="outlined"
              rows="4"
            />
          </v-col>
          <v-col cols="12" class="d-flex justify-end">
            <v-btn
              color="success"
              prepend-icon="mdi-content-save"
              :loading="saving"
              :disabled="!authStore.canPerform('APPLICATIONS', 'update')"
              @click="saveParameters"
            >
              Guardar parámetros
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import api from "@/api/http";
import { useAuthStore } from "@/stores/auth.store";

const authStore = useAuthStore();
const applications = ref([]);
const headerCatalog = ref([] as Array<{ id: number; name: string }>);
const selectedApplicationId = ref(null);
const saving = ref(false);
const snackbar = ref({ show: false, message: "", color: "success" });

const form = ref({
  auth_type: "none",
  auth_username: "",
  auth_password: "",
});
const authConfigJson = ref("");
const headersJson = ref("");
const pluginsJson = ref("");
const headerRows = ref([] as Array<{ key: string; value: string }>);

const headerCatalogNames = computed(() => headerCatalog.value.map((h: { id: number; name: string }) => h.name));

function extractArray(data: any): any[] {
  if (!data?.resultObj) return [];
  if (Array.isArray(data.resultObj?.items)) return data.resultObj.items;
  if (Array.isArray(data.resultObj)) return data.resultObj;
  return [];
}

function showNotification(message: string, color = "success") {
  snackbar.value = { show: true, message, color };
}

async function loadApplications() {
  const { data } = await api.get("/applications");
  applications.value = extractArray(data);
}

async function loadHeaderCatalog() {
  try {
    const { data } = await api.get("/headers");
    headerCatalog.value = extractArray(data);
  } catch {
    headerCatalog.value = [];
    showNotification("No se pudo cargar catálogo de headers", "error");
  }
}

function parseHeadersToRows(raw: string) {
  if (!raw.trim()) {
    headerRows.value = [];
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      headerRows.value = [];
      return;
    }
    headerRows.value = Object.entries(parsed).map(([key, value]) => ({
      key,
      value: String(value ?? ""),
    }));
  } catch {
    headerRows.value = [];
  }
}

function addHeaderRow() {
  headerRows.value.push({ key: "", value: "" });
}

function removeHeaderRow(index: number) {
  headerRows.value.splice(index, 1);
}

async function loadParameters() {
  if (!selectedApplicationId.value) return;
  try {
    const { data } = await api.get(`/applications/${selectedApplicationId.value}/parameters`);
    const p = data?.resultObj || {};
    form.value = {
      auth_type: p.auth_type || "none",
      auth_username: p.auth_username || "",
      auth_password: p.auth_password || "",
    };
    authConfigJson.value = p.auth_config ? JSON.stringify(p.auth_config, null, 2) : "";
    headersJson.value = p.headers_globales ? JSON.stringify(p.headers_globales, null, 2) : "";
    parseHeadersToRows(headersJson.value);
    pluginsJson.value = p.plugins_apisix ? JSON.stringify(p.plugins_apisix, null, 2) : "";
  } catch {
    showNotification("No se pudo cargar parámetros", "error");
  }
}

async function saveParameters() {
  if (!selectedApplicationId.value) return;
  saving.value = true;
  try {
    const payload = {
      auth_type: form.value.auth_type,
      auth_username: form.value.auth_username || null,
      auth_password: form.value.auth_password || null,
      auth_config: authConfigJson.value.trim() ? JSON.parse(authConfigJson.value) : null,
      headers_globales: headersJson.value.trim() ? JSON.parse(headersJson.value) : null,
      plugins_apisix: pluginsJson.value.trim() ? JSON.parse(pluginsJson.value) : null,
    };
    await api.patch(`/applications/${selectedApplicationId.value}/parameters`, payload);
    showNotification("Parámetros actualizados");
  } catch (error: any) {
    showNotification(error?.response?.data?.detail || "Error al guardar parámetros", "error");
  } finally {
    saving.value = false;
  }
}

watch(
  () => headerRows.value,
  (rows: Array<{ key: string; value: string }>) => {
    const compact = rows
      .filter((r: { key: string; value: string }) => r.key?.trim() && r.value?.trim())
      .reduce((acc: Record<string, string>, curr: { key: string; value: string }) => {
        acc[curr.key.trim()] = curr.value.trim();
        return acc;
      }, {});
    headersJson.value = Object.keys(compact).length ? JSON.stringify(compact, null, 2) : "";
  },
  { deep: true },
);

watch(
  () => headersJson.value,
  (value: string) => {
    if (!value.trim()) {
      headerRows.value = [];
    }
  },
);

onMounted(async () => {
  await Promise.all([loadApplications(), loadHeaderCatalog()]);
});
</script>
