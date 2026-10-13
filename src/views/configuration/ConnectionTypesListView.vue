<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card elevation="2" rounded="lg">
          <v-card-title class="d-flex align-center pa-6">
            <v-icon color="success" size="32" class="mr-3">mdi-lan-connect</v-icon>
            <span class="text-h5 font-weight-bold">Tipos de Conexión</span>
            <v-spacer></v-spacer>
            <v-btn
              v-if="authStore.canPerform('CONNECTION_TYPES', 'create')"
              color="success"
              prepend-icon="mdi-plus"
              elevation="0"
              @click="openCreateDialog"
            >
              Crear Tipo
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
          <v-data-table :headers="headers" :items="filteredItems" :items-per-page="10" :loading="loading" class="elevation-0">
            <template #item.id="{ item }">
              <v-chip :text="`#${item.id}`" size="small" variant="tonal" color="grey"></v-chip>
            </template>
            <template #item.actions="{ item }">
              <div class="d-flex justify-end ga-2">
                <v-btn
                  v-if="authStore.canPerform('CONNECTION_TYPES', 'update')"
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  @click="openEditDialog(item)"
                />
                <v-btn
                  v-if="authStore.canPerform('CONNECTION_TYPES', 'delete')"
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
        <v-card-title class="pa-6">{{ isEditing ? "Editar" : "Crear" }} Tipo de Conexión</v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-6">
          <v-form ref="formRef" v-model="formValid" @submit.prevent="saveItem">
            <v-text-field
              v-model="currentItem.name"
              label="Nombre *"
              variant="outlined"
              prepend-inner-icon="mdi-lan-connect"
              :rules="[rules.required]"
            />
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-6">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeDialog">Cancelar</v-btn>
          <v-btn color="success" variant="elevated" @click="saveItem" :loading="saving" :disabled="!formValid">
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
          ¿Está seguro que desea eliminar <strong>{{ itemToDelete?.name }}</strong>?
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-6">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" variant="elevated" :loading="deleting" @click="confirmDelete">Eliminar</v-btn>
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
const items = ref([]);
const loading = ref(false);
const dialog = ref(false);
const deleteDialog = ref(false);
const isEditing = ref(false);
const formValid = ref(false);
const saving = ref(false);
const deleting = ref(false);
const searchQuery = ref("");
const formRef = ref(null);
const currentItem = ref({ id: null, name: "" });
const itemToDelete = ref(null);
const snackbar = ref({ show: false, message: "", color: "success" });

const headers = [
  { title: "ID", key: "id", sortable: true },
  { title: "Nombre", key: "name", sortable: true },
  { title: "Acciones", key: "actions", sortable: false, align: "end" as const },
];

const rules = {
  required: (value: string) => !!value || "Este campo es requerido",
};

const filteredItems = computed(() => {
  if (!searchQuery.value) return items.value;
  const query = searchQuery.value.toLowerCase();
  return items.value.filter((item: { id: number; name: string }) => item.name.toLowerCase().includes(query) || String(item.id).includes(query));
});

function showNotification(message: string, color = "success") {
  snackbar.value = { show: true, message, color };
}

async function loadItems() {
  loading.value = true;
  try {
    const { data } = await api.get("/connection-types");
    const resultObj = data?.resultObj;
    if (resultObj?.items && Array.isArray(resultObj.items)) items.value = resultObj.items;
    else if (Array.isArray(resultObj)) items.value = resultObj;
    else items.value = [];
  } catch (error) {
    items.value = [];
    showNotification("Error al cargar tipos de conexión", "error");
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  isEditing.value = false;
  currentItem.value = { id: null, name: "" };
  dialog.value = true;
}

function openEditDialog(item: any) {
  isEditing.value = true;
  currentItem.value = { id: item.id, name: item.name };
  dialog.value = true;
}

function closeDialog() {
  dialog.value = false;
  currentItem.value = { id: null, name: "" };
}

async function saveItem() {
  if (!formRef.value) return;
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  saving.value = true;
  try {
    if (isEditing.value && currentItem.value.id) {
      await api.patch(`/connection-types/${currentItem.value.id}`, { name: currentItem.value.name });
      showNotification("Tipo de conexión actualizado");
    } else {
      await api.post("/connection-types", { name: currentItem.value.name });
      showNotification("Tipo de conexión creado");
    }
    await loadItems();
    closeDialog();
  } catch (error: any) {
    showNotification(error?.response?.data?.detail || "Error al guardar", "error");
  } finally {
    saving.value = false;
  }
}

function openDeleteDialog(item: any) {
  itemToDelete.value = item;
  deleteDialog.value = true;
}

async function confirmDelete() {
  if (!itemToDelete.value) return;
  deleting.value = true;
  try {
    await api.delete(`/connection-types/${itemToDelete.value.id}`);
    showNotification("Tipo de conexión eliminado");
    await loadItems();
    deleteDialog.value = false;
  } catch (error: any) {
    showNotification(error?.response?.data?.detail || "Error al eliminar", "error");
  } finally {
    deleting.value = false;
  }
}

onMounted(loadItems);
</script>
