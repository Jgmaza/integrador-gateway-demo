<template>
  <v-container fluid>
    <v-card elevation="2" rounded="lg">
      <v-card-title class="d-flex align-center pa-6">
        <v-icon color="success" size="32" class="mr-3">mdi-link-variant</v-icon>
        <span class="text-h5 font-weight-bold">Asociaciones de Aplicaciones</span>
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
              @update:model-value="loadAssignedUsers"
            />
          </v-col>
        </v-row>

        <v-row v-if="selectedApplicationId">
          <v-col cols="12" md="8">
            <v-autocomplete
              v-model="selectedUserIds"
              :items="users"
              item-title="email"
              item-value="id"
              label="Usuarios asignados"
              prepend-inner-icon="mdi-account-group"
              variant="outlined"
              multiple
              chips
              closable-chips
              clearable
            />
          </v-col>
          <v-col cols="12" md="4" class="d-flex align-center">
            <v-btn
              color="success"
              block
              prepend-icon="mdi-content-save"
              :loading="saving"
              :disabled="!authStore.canPerform('APPLICATIONS', 'update')"
              @click="saveAssociations"
            >
              Guardar asociaciones
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
import { onMounted, ref } from "vue";
import api from "@/api/http";
import { useAuthStore } from "@/stores/auth.store";

const authStore = useAuthStore();
const applications = ref([]);
const users = ref([]);
const selectedApplicationId = ref(null);
const selectedUserIds = ref([]);
const saving = ref(false);
const snackbar = ref({ show: false, message: "", color: "success" });

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

async function loadUsers() {
  const { data } = await api.get("/users");
  users.value = extractArray(data);
}

async function loadAssignedUsers() {
  if (!selectedApplicationId.value) {
    selectedUserIds.value = [];
    return;
  }
  try {
    const { data } = await api.get(`/applications/${selectedApplicationId.value}/users`);
    const assigned = extractArray(data);
    selectedUserIds.value = assigned.map((u) => u.id);
  } catch {
    selectedUserIds.value = [];
    showNotification("No se pudo cargar asociaciones actuales", "error");
  }
}

async function saveAssociations() {
  if (!selectedApplicationId.value) return;
  saving.value = true;
  try {
    await api.put(`/applications/${selectedApplicationId.value}/users`, { user_ids: selectedUserIds.value });
    showNotification("Asociaciones actualizadas");
  } catch (error: any) {
    showNotification(error?.response?.data?.detail || "Error al guardar asociaciones", "error");
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadApplications(), loadUsers()]);
});
</script>
