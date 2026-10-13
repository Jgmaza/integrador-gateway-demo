<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card elevation="2" rounded="lg">
          <v-card-title class="d-flex align-center pa-6">
            <v-icon color="success" size="32" class="mr-3">mdi-format-header-1</v-icon>
            <span class="text-h5 font-weight-bold">Gestión de Headers</span>
            <v-spacer></v-spacer>
            <v-btn
              color="success"
              prepend-icon="mdi-plus"
              @click="openCreateDialog"
              :disabled="!authStore.canPerform('HEADERS', 'create')"
              elevation="0"
            >
              Crear Header
            </v-btn>
          </v-card-title>

          <v-divider></v-divider>

          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="searchQuery"
                  label="Buscar"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider></v-divider>

          <v-data-table
            :headers="headers"
            :items="filteredHeaders"
            :items-per-page="10"
            :loading="loading"
            class="elevation-0"
          >
            <template #item.id="{ item }">
              <v-chip :text="`#${item.id}`" size="small" variant="tonal" color="grey" />
            </template>

            <template #item.actions="{ item }">
              <div class="d-flex justify-end ga-2">
                <v-btn
                  v-if="authStore.canPerform('HEADERS', 'update')"
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  @click="openEditDialog(item)"
                />
                <v-btn
                  v-if="authStore.canPerform('HEADERS', 'delete')"
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  color="error"
                  @click="openDeleteDialog(item)"
                />
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" max-width="600px" persistent>
      <v-card>
        <v-card-title class="pa-6">
          <span class="text-h5">{{ isEditing ? "Editar" : "Crear" }} Header</span>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-6">
          <v-form ref="formRef" v-model="formValid" @submit.prevent="saveHeader">
            <v-text-field
              v-model="currentHeader.name"
              label="Nombre del Header *"
              variant="outlined"
              prepend-inner-icon="mdi-format-header-1"
              :rules="[rules.required]"
              hint="Ej: Authorization, Content-Type, X-Request-Id"
              persistent-hint
            />
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-6">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeDialog">Cancelar</v-btn>
          <v-btn color="success" variant="elevated" @click="saveHeader" :loading="saving" :disabled="!formValid">
            {{ isEditing ? "Actualizar" : "Crear" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title class="pa-6">Confirmar Eliminación</v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-6">
          <p>¿Está seguro que desea eliminar el header <strong>{{ headerToDelete?.name }}</strong>?</p>
          <p class="text-error mt-2">Esta acción no se puede deshacer.</p>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-6">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" variant="elevated" @click="confirmDelete" :loading="deleting">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import api from "@/api/http";
import { useAuthStore } from "@/stores/auth.store";

const authStore = useAuthStore();

const headersData = ref<any[]>([]);
const loading = ref(false);
const dialog = ref(false);
const deleteDialog = ref(false);
const isEditing = ref(false);
const formValid = ref(false);
const saving = ref(false);
const deleting = ref(false);
const searchQuery = ref("");
const formRef = ref<any>(null);

const currentHeader = ref({ id: null as number | null, name: "" });
const headerToDelete = ref<any>(null);

const snackbar = ref({
  show: false,
  message: "",
  color: "success",
});

const headers = [
  { title: "ID", key: "id", sortable: true },
  { title: "Nombre", key: "name", sortable: true },
  { title: "Acciones", key: "actions", sortable: false, align: "end" as const },
];

const rules = {
  required: (value: string) => !!value || "Este campo es requerido",
};

const filteredHeaders = computed(() => {
  if (!searchQuery.value) return headersData.value;
  const query = searchQuery.value.toLowerCase();
  return headersData.value.filter(
    (item) => item.name.toLowerCase().includes(query) || item.id.toString().includes(query),
  );
});

function extractArray(data: any): any[] {
  if (!data?.resultObj) return [];
  if (data.resultObj.items && Array.isArray(data.resultObj.items)) return data.resultObj.items;
  if (Array.isArray(data.resultObj)) return data.resultObj;
  return [];
}

function showNotification(message: string, color: string) {
  snackbar.value = { show: true, message, color };
}

async function loadHeaders() {
  loading.value = true;
  try {
    const { data } = await api.get("/headers");
    headersData.value = extractArray(data);
  } catch (error) {
    headersData.value = [];
    showNotification("Error al cargar headers", "error");
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  isEditing.value = false;
  currentHeader.value = { id: null, name: "" };
  dialog.value = true;
}

function openEditDialog(item: any) {
  isEditing.value = true;
  currentHeader.value = { id: item.id, name: item.name };
  dialog.value = true;
}

function closeDialog() {
  dialog.value = false;
  currentHeader.value = { id: null, name: "" };
}

async function saveHeader() {
  if (!formRef.value) return;
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  saving.value = true;
  try {
    if (isEditing.value && currentHeader.value.id) {
      await api.patch(`/headers/${currentHeader.value.id}`, { name: currentHeader.value.name });
      showNotification("Header actualizado exitosamente", "success");
    } else {
      await api.post("/headers", { name: currentHeader.value.name });
      showNotification("Header creado exitosamente", "success");
    }
    await loadHeaders();
    closeDialog();
  } catch (error: any) {
    showNotification(error.response?.data?.detail || "Error al guardar header", "error");
  } finally {
    saving.value = false;
  }
}

function openDeleteDialog(item: any) {
  headerToDelete.value = item;
  deleteDialog.value = true;
}

async function confirmDelete() {
  if (!headerToDelete.value) return;
  deleting.value = true;
  try {
    await api.delete(`/headers/${headerToDelete.value.id}`);
    showNotification("Header eliminado exitosamente", "success");
    await loadHeaders();
    deleteDialog.value = false;
  } catch (error: any) {
    showNotification(error.response?.data?.detail || "Error al eliminar header", "error");
  } finally {
    deleting.value = false;
  }
}

onMounted(loadHeaders);
</script>
