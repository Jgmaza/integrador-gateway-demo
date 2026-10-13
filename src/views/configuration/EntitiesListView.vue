<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card elevation="2" rounded="lg">
          <!-- Header -->
          <v-card-title class="d-flex align-center pa-6">
            <v-icon color="success" size="32" class="mr-3">mdi-office-building</v-icon>
            <span class="text-h5 font-weight-bold">Gestión de Entidades</span>
            <v-spacer></v-spacer>
            <v-btn
              v-if="authStore.canPerform('ENTITIES', 'create')"
              color="success"
              prepend-icon="mdi-plus"
              @click="openCreateDialog"
              elevation="0"
            >
              Crear Entidad
            </v-btn>
          </v-card-title>

          <v-divider></v-divider>

          <!-- Filtros -->
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
                ></v-text-field>
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider></v-divider>

          <!-- Tabla -->
          <v-data-table
            :headers="headers"
            :items="filteredEntities"
            :items-per-page="10"
            :loading="loading"
            class="elevation-0"
          >
            <template v-slot:item.name="{ item }">
              <div class="d-flex align-center py-2">
                <v-avatar color="success" size="32" class="mr-3">
                  <v-icon size="18" color="white">mdi-office-building</v-icon>
                </v-avatar>
                <div>
                  <span class="font-weight-medium">{{ item.name }}</span>
                </div>
              </div>
            </template>

            <template v-slot:item.id="{ item }">
              <v-chip
                :text="`#${item.id}`"
                size="small"
                variant="tonal"
                color="grey"
              ></v-chip>
            </template>

            <template v-slot:item.actions="{ item }">
              <div class="d-flex justify-end ga-2">
                <v-tooltip text="Editar" location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-if="authStore.canPerform('ENTITIES', 'update')"
                      icon="mdi-pencil"
                      size="small"
                      variant="text"
                      v-bind="props"
                      @click="openEditDialog(item)"
                    ></v-btn>
                  </template>
                </v-tooltip>

                <v-tooltip text="Eliminar" location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-if="authStore.canPerform('ENTITIES', 'delete')"
                      icon="mdi-delete"
                      size="small"
                      variant="text"
                      color="error"
                      v-bind="props"
                      @click="openDeleteDialog(item)"
                    ></v-btn>
                  </template>
                </v-tooltip>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog Crear/Editar -->
    <v-dialog v-model="dialog" max-width="600px" persistent>
      <v-card>
        <v-card-title class="pa-6">
          <span class="text-h5">{{ isEditing ? 'Editar' : 'Crear' }} Entidad</span>
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text class="pa-6">
          <v-form ref="formRef" v-model="formValid" @submit.prevent="saveEntity">
            <v-text-field
              v-model="currentEntity.name"
              label="Nombre de la Entidad *"
              variant="outlined"
              :rules="[rules.required]"
              prepend-inner-icon="mdi-office-building"
              hint="Ej: Ministerio de Minas y Energía"
              persistent-hint
            ></v-text-field>
          </v-form>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-6">
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="closeDialog"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="success"
            variant="elevated"
            @click="saveEntity"
            :loading="saving"
            :disabled="!formValid"
          >
            {{ isEditing ? 'Actualizar' : 'Crear' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Eliminar -->
    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title class="pa-6">
          <div class="d-flex align-center">
            <v-icon color="error" size="28" class="mr-2">mdi-alert-circle</v-icon>
            <span class="text-h5">Confirmar Eliminación</span>
          </div>
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text class="pa-6">
          <p>¿Está seguro que desea eliminar la entidad <strong>{{ entityToDelete?.name }}</strong>?</p>
          <p class="text-error mt-2">Esta acción no se puede deshacer.</p>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-6">
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="deleteDialog = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="elevated"
            @click="confirmDelete"
            :loading="deleting"
          >
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="top"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/api/http'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()

// State
const entities = ref([])
const loading = ref(false)
const dialog = ref(false)
const deleteDialog = ref(false)
const isEditing = ref(false)
const formValid = ref(false)
const saving = ref(false)
const deleting = ref(false)
const searchQuery = ref('')
const formRef = ref<any>(null)

const currentEntity = ref({
  id: null as number | null,
  name: ''
})

const entityToDelete = ref(null)

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

// Headers de la tabla
const headers = [
  { title: 'ID', key: 'id', sortable: true },
  { title: 'Nombre', key: 'name', sortable: true },
  { title: 'Acciones', key: 'actions', sortable: false, align: 'end' }
]

// Reglas de validación
const rules = {
  required: (value: any) => !!value || 'Este campo es requerido'
}

// Computed
const filteredEntities = computed(() => {
  if (!searchQuery.value) return entities.value
  
  const query = searchQuery.value.toLowerCase()
  return entities.value.filter((entity: any) =>
    entity.name.toLowerCase().includes(query) ||
    entity.id.toString().includes(query)
  )
})

// Methods
async function loadEntities() {
  loading.value = true
  try {
    const { data } = await api.get('/entities')
    
    // Manejar respuesta paginada o array directo
    if (data.resultObj) {
      if (data.resultObj.items && Array.isArray(data.resultObj.items)) {
        entities.value = data.resultObj.items
      } else if (Array.isArray(data.resultObj)) {
        entities.value = data.resultObj
      } else {
        entities.value = []
      }
    } else {
      entities.value = []
    }
  } catch (error: any) {
    showNotification('Error al cargar entidades', 'error')
    console.error('Error loading entities:', error)
    entities.value = []
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  isEditing.value = false
  currentEntity.value = {
    id: null,
    name: ''
  }
  dialog.value = true
}

function openEditDialog(entity: any) {
  isEditing.value = true
  currentEntity.value = {
    id: entity.id,
    name: entity.name
  }
  dialog.value = true
}

function closeDialog() {
  dialog.value = false
  currentEntity.value = {
    id: null,
    name: ''
  }
}

async function saveEntity() {
  if (!formRef.value) return

  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    if (isEditing.value && currentEntity.value.id) {
      // Actualizar con PATCH
      await api.patch(`/entities/${currentEntity.value.id}`, {
        name: currentEntity.value.name
      })
      showNotification('Entidad actualizada exitosamente', 'success')
    } else {
      // Crear
      await api.post('/entities', {
        name: currentEntity.value.name
      })
      showNotification('Entidad creada exitosamente', 'success')
    }
    
    await loadEntities()
    closeDialog()
  } catch (error: any) {
    const detail = error.response?.data?.detail || 'Error al guardar entidad'
    showNotification(detail, 'error')
    console.error('Error saving entity:', error)
  } finally {
    saving.value = false
  }
}

function openDeleteDialog(entity: any) {
  entityToDelete.value = entity
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!entityToDelete.value) return
  
  deleting.value = true
  try {
    await api.delete(`/entities/${entityToDelete.value.id}`)
    showNotification('Entidad eliminada exitosamente', 'success')
    await loadEntities()
    deleteDialog.value = false
  } catch (error: any) {
    showNotification(error.response?.data?.detail || 'Error al eliminar entidad', 'error')
    console.error('Error deleting entity:', error)
  } finally {
    deleting.value = false
  }
}

function showNotification(message: string, color: string) {
  snackbar.value = {
    show: true,
    message,
    color
  }
}

onMounted(() => {
  loadEntities()
})
</script>

<style scoped>
.v-data-table {
  background: transparent !important;
}
</style>