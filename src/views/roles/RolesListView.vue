<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card elevation="2" rounded="lg">
          <v-card-title class="d-flex align-center pa-6">
            <v-icon color="primary" size="32" class="mr-3">mdi-shield-account</v-icon>
            <span class="text-h5 font-weight-bold">Gestión de Roles</span>
            <v-spacer></v-spacer>
            <v-btn
              v-if="authStore.canPerform('ROLES', 'create')"
              color="primary"
              prepend-icon="mdi-plus"
              @click="add"
              elevation="0"
            >
              Crear Rol
            </v-btn>
          </v-card-title>

          <v-divider></v-divider>

          <!-- Filtros -->
          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="searchQuery"
                  label="Buscar rol"
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

          <v-data-table
            :headers="headers"
            :items="filteredRoles"
            :items-per-page="10"
            :loading="loading"
            class="elevation-0"
          >
            <template v-slot:item.name="{ item }">
              <div class="d-flex align-center py-2">
                <v-avatar :color="getRoleColor(item.name)" size="32" class="mr-3">
                  <v-icon size="18" color="white">{{ getRoleIcon(item.name) }}</v-icon>
                </v-avatar>
                <div>
                  <span class="font-weight-medium text-capitalize">{{ item.name }}</span>
                  <div class="text-caption text-medium-emphasis">
                    {{ getRoleDescription(item.name) }}
                  </div>
                </div>
              </div>
            </template>

            <template v-slot:item.user_count="{ item }">
              <v-chip
                :color="item.user_count > 0 ? 'primary' : 'grey'"
                size="small"
                variant="tonal"
                @click="viewRoleUsers(item)"
                style="cursor: pointer;"
              >
                <v-icon start size="small">mdi-account-group</v-icon>
                {{ item.user_count }} usuario{{ item.user_count !== 1 ? 's' : '' }}
              </v-chip>
            </template>

            <template v-slot:item.permissions="{ item }">
              <v-btn
                variant="text"
                color="info"
                size="small"
                @click="viewPermissions(item)"
              >
                <v-icon start size="small">mdi-eye</v-icon>
                Ver permisos
              </v-btn>
            </template>

            <template v-slot:item.actions="{ item }">
              <div class="d-flex justify-end ga-1">
                <!-- Ver permisos -->
                <v-btn
                  icon="mdi-shield-check"
                  size="small"
                  variant="text"
                  color="info"
                  @click="viewPermissions(item)"
                  title="Ver permisos"
                ></v-btn>
                
                <!-- Editar -->
                <v-btn
                  v-if="authStore.canPerform('ROLES', 'update') && !isSystemRole(item.name)"
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  color="primary"
                  @click="edit(item)"
                  title="Editar"
                ></v-btn>
                
                <!-- Eliminar -->
                <v-btn
                  v-if="authStore.canPerform('ROLES', 'delete') && !isSystemRole(item.name)"
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  color="error"
                  @click="confirmDelete(item)"
                  title="Eliminar"
                ></v-btn>
              </div>
            </template>

            <template v-slot:no-data>
              <div class="text-center py-8">
                <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-shield-off</v-icon>
                <p class="text-h6 text-medium-emphasis mb-4">No hay roles registrados</p>
                <v-btn
                  v-if="authStore.canPerform('ROLES', 'create')"
                  color="primary"
                  prepend-icon="mdi-plus"
                  @click="add"
                  variant="outlined"
                >
                  Crear Primer Rol
                </v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diálogo Crear/Editar Rol -->
    <v-dialog v-model="dialog" max-width="500" persistent>
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center bg-primary pa-4">
          <v-icon color="white" class="mr-2">
            {{ isEditing ? 'mdi-pencil' : 'mdi-plus' }}
          </v-icon>
          <span class="text-h6 text-white">
            {{ isEditing ? 'Editar Rol' : 'Crear Nuevo Rol' }}
          </span>
        </v-card-title>

        <v-form ref="formRef" v-model="formValid" @submit.prevent="save">
          <v-card-text class="pt-6">
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="formModel.name"
                  label="Nombre del Rol"
                  prepend-inner-icon="mdi-shield-account"
                  variant="outlined"
                  color="primary"
                  :rules="nameRules"
                  required
                  hint="Ejemplo: editor, moderator, analyst"
                  persistent-hint
                ></v-text-field>
              </v-col>
            </v-row>

            <v-alert
              v-if="!isEditing"
              type="info"
              variant="tonal"
              density="compact"
              class="mt-4"
            >
              <strong>Nota:</strong> Después de crear el rol, deberás configurar sus permisos 
              en el archivo <code>app/core/permissions.py</code> del backend.
            </v-alert>

            <v-alert
              v-if="isEditing"
              type="warning"
              variant="tonal"
              density="compact"
              class="mt-4"
            >
              <strong>Advertencia:</strong> Cambiar el nombre del rol puede afectar la matriz de permisos.
            </v-alert>
          </v-card-text>

          <v-divider></v-divider>

          <v-card-actions class="pa-4">
            <v-btn
              variant="text"
              @click="closeDialog"
            >
              Cancelar
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              variant="elevated"
              @click="save"
              :loading="saving"
              :disabled="!formValid"
            >
              {{ isEditing ? 'Actualizar' : 'Crear' }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <!-- Diálogo Ver Permisos -->
    <v-dialog v-model="permissionsDialog" max-width="700">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center bg-info pa-4">
          <v-icon color="white" class="mr-2">mdi-shield-check</v-icon>
          <span class="text-h6 text-white">
            Permisos del Rol: {{ selectedRole?.name }}
          </span>
        </v-card-title>

        <v-card-text class="pt-6" v-if="rolePermissions">
          <v-expansion-panels variant="accordion">
            <v-expansion-panel
              v-for="(actions, resource) in rolePermissions"
              :key="resource"
            >
              <v-expansion-panel-title>
                <div class="d-flex align-center">
                  <v-icon class="mr-2" color="primary">{{ getResourceIcon(resource) }}</v-icon>
                  <span class="font-weight-medium">{{ resource }}</span>
                  <v-chip
                    size="x-small"
                    variant="tonal"
                    color="primary"
                    class="ml-2"
                  >
                    {{ actions.length }} acciones
                  </v-chip>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="d-flex flex-wrap ga-2">
                  <v-chip
                    v-for="action in actions"
                    :key="action"
                    size="small"
                    variant="outlined"
                    :color="getActionColor(action)"
                  >
                    <v-icon start size="small">{{ getActionIcon(action) }}</v-icon>
                    {{ action }}
                  </v-chip>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <v-alert
            v-if="Object.keys(rolePermissions).length === 0"
            type="warning"
            variant="tonal"
            class="mt-4"
          >
            Este rol no tiene permisos configurados en la matriz de permisos.
          </v-alert>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="permissionsDialog = false"
          >
            Cerrar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo Ver Usuarios del Rol -->
    <v-dialog v-model="usersDialog" max-width="600">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center bg-primary pa-4">
          <v-icon color="white" class="mr-2">mdi-account-group</v-icon>
          <span class="text-h6 text-white">
            Usuarios con rol: {{ selectedRole?.name }}
          </span>
        </v-card-title>

        <v-card-text class="pt-4">
          <v-list v-if="roleUsers.length > 0">
            <v-list-item
              v-for="user in roleUsers"
              :key="user.id"
            >
              <template v-slot:prepend>
                <v-avatar color="primary" size="32">
                  <v-icon size="18" color="white">mdi-account</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title>{{ user.email }}</v-list-item-title>
              <v-list-item-subtitle>{{ user.full_name || 'Sin nombre' }}</v-list-item-subtitle>
              <template v-slot:append>
                <v-chip
                  :color="user.is_active ? 'success' : 'error'"
                  size="x-small"
                  variant="tonal"
                >
                  {{ user.is_active ? 'Activo' : 'Inactivo' }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>

          <div v-else class="text-center py-8">
            <v-icon size="48" color="grey-lighten-1" class="mb-4">mdi-account-off</v-icon>
            <p class="text-medium-emphasis">No hay usuarios con este rol asignado</p>
          </div>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="usersDialog = false"
          >
            Cerrar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo Confirmar Eliminación -->
    <v-dialog v-model="deleteDialog" max-width="450">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center bg-error pa-4">
          <v-icon color="white" class="mr-2">mdi-alert</v-icon>
          <span class="text-h6 text-white">Confirmar Eliminación</span>
        </v-card-title>

        <v-card-text class="pt-6">
          <p class="text-body-1">
            ¿Estás seguro de que deseas eliminar el rol 
            <strong>{{ roleToDelete?.name }}</strong>?
          </p>
          
          <v-alert
            v-if="roleToDelete?.user_count > 0"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-4"
          >
            <strong>Advertencia:</strong> Este rol tiene {{ roleToDelete.user_count }} usuario(s) asignado(s).
          </v-alert>

          <v-checkbox
            v-if="roleToDelete?.user_count > 0"
            v-model="forceDelete"
            label="Forzar eliminación (los usuarios quedarán sin rol)"
            color="error"
            hide-details
            class="mt-2"
          ></v-checkbox>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-4">
          <v-btn
            variant="text"
            @click="deleteDialog = false"
          >
            Cancelar
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="error"
            variant="elevated"
            @click="remove"
            :loading="deleting"
            :disabled="roleToDelete?.user_count > 0 && !forceDelete"
          >
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar para notificaciones -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
    >
      {{ snackbar.message }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">
          Cerrar
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
  import { onMounted, ref, shallowRef, toRef, computed } from 'vue'
  import type { Role } from "@/types"
  import api from "@/api/http"
  import { useAuthStore } from "@/stores/auth.store"

  const authStore = useAuthStore()

  // Types
  interface RoleWithCount extends Role {
    user_count: number
  }

  interface RoleUser {
    id: number
    email: string
    full_name: string | null
    is_active: boolean
  }

  // Form model
  function createNewRecord() {
    return {
      id: null as number | null,
      name: ''
    }
  }

  // State
  const roles = ref<RoleWithCount[]>([])
  const formModel = ref(createNewRecord())
  const dialog = shallowRef(false)
  const deleteDialog = shallowRef(false)
  const permissionsDialog = shallowRef(false)
  const usersDialog = shallowRef(false)
  const roleToDelete = ref<RoleWithCount | null>(null)
  const selectedRole = ref<RoleWithCount | null>(null)
  const rolePermissions = ref<Record<string, string[]> | null>(null)
  const roleUsers = ref<RoleUser[]>([])
  const isEditing = toRef(() => !!formModel.value.id)
  const saving = ref(false)
  const deleting = ref(false)
  const loading = ref(false)
  const formRef = ref<any>(null)
  const formValid = ref(false)
  const forceDelete = ref(false)

  // Filtros
  const searchQuery = ref('')

  // Snackbar
  const snackbar = ref({
    show: false,
    message: '',
    color: 'success'
  })

  // Roles del sistema que no se pueden editar/eliminar
  const systemRoles = ['superuser', 'admin', 'manager', 'viewer']

  // Computed
  const filteredRoles = computed(() => {
    if (!searchQuery.value) return roles.value
    
    const query = searchQuery.value.toLowerCase()
    return roles.value.filter(r => 
      r.name.toLowerCase().includes(query)
    )
  })

  // Reglas de validación
  const nameRules = [
    (v: string) => !!v || 'El nombre es requerido',
    (v: string) => v.length >= 3 || 'El nombre debe tener al menos 3 caracteres',
    (v: string) => v.length <= 100 || 'El nombre no puede exceder 100 caracteres',
    (v: string) => /^[a-z_]+$/.test(v) || 'Solo letras minúsculas y guiones bajos',
  ]

  const headers = [
    { title: 'Rol', key: 'name', align: 'start' as const },
    { title: 'Usuarios', key: 'user_count', align: 'center' as const },
    { title: 'Permisos', key: 'permissions', align: 'center' as const },
    { title: 'Acciones', key: 'actions', align: 'end' as const, sortable: false },
  ]

  // Helpers
  function isSystemRole(name: string): boolean {
    return systemRoles.includes(name.toLowerCase())
  }

  function getRoleColor(name: string): string {
    const colors: Record<string, string> = {
      'superuser': 'error',
      'admin': 'orange',
      'manager': 'blue',
      'viewer': 'green'
    }
    return colors[name.toLowerCase()] || 'purple'
  }

  function getRoleIcon(name: string): string {
    const icons: Record<string, string> = {
      'superuser': 'mdi-shield-crown',
      'admin': 'mdi-shield-star',
      'manager': 'mdi-shield-account',
      'viewer': 'mdi-eye'
    }
    return icons[name.toLowerCase()] || 'mdi-shield'
  }

  function getRoleDescription(name: string): string {
    const descriptions: Record<string, string> = {
      'superuser': 'Acceso total al sistema',
      'admin': 'Administrador del sistema',
      'manager': 'Gestión de recursos',
      'viewer': 'Solo lectura'
    }
    return descriptions[name.toLowerCase()] || 'Rol personalizado'
  }

  function getResourceIcon(resource: string): string {
    const icons: Record<string, string> = {
      'USERS': 'mdi-account-group',
      'APPLICATIONS': 'mdi-apps',
      'ENTITIES': 'mdi-domain',
      'INTEGRATORS': 'mdi-connection',
      'ROLES': 'mdi-shield-account',
      'AUDIT': 'mdi-file-document',
      'HEADERS': 'mdi-format-header-1',
      'ASSOCIATIONS': 'mdi-link-variant',
      'PROXY': 'mdi-server-network'
    }
    return icons[resource] || 'mdi-folder'
  }

  function getActionColor(action: string): string {
    const colors: Record<string, string> = {
      'list': 'info',
      'get': 'info',
      'create': 'success',
      'update': 'warning',
      'delete': 'error',
      'activate': 'success',
      'deactivate': 'warning'
    }
    return colors[action] || 'grey'
  }

  function getActionIcon(action: string): string {
    const icons: Record<string, string> = {
      'list': 'mdi-format-list-bulleted',
      'get': 'mdi-eye',
      'get_me': 'mdi-account',
      'create': 'mdi-plus',
      'update': 'mdi-pencil',
      'delete': 'mdi-delete',
      'activate': 'mdi-account-check',
      'deactivate': 'mdi-account-off'
    }
    return icons[action] || 'mdi-check'
  }

  function showNotification(message: string, color: string = 'success') {
    snackbar.value = { show: true, message, color }
  }

  // API calls
  async function loadRoles() {
    loading.value = true
    try {
      const { data } = await api.get("/roles", { params: { skip: 0, limit: 500 } })
      roles.value = data['resultObj']
    } catch (error) {
      console.error('Error loading roles:', error)
      showNotification('Error al cargar roles', 'error')
    } finally {
      loading.value = false
    }
  }

  async function loadRolePermissions(roleId: number) {
    try {
      const { data } = await api.get(`/roles/${roleId}/permissions`)
      rolePermissions.value = data['resultObj'].permissions
    } catch (error) {
      console.error('Error loading permissions:', error)
      rolePermissions.value = {}
    }
  }

  async function loadRoleUsers(roleId: number) {
    try {
      const { data } = await api.get(`/roles/${roleId}/users`)
      roleUsers.value = data['resultObj']
    } catch (error) {
      console.error('Error loading role users:', error)
      roleUsers.value = []
    }
  }

  // CRUD operations
  function add() {
    formModel.value = createNewRecord()
    dialog.value = true
  }

  function edit(item: RoleWithCount) {
    formModel.value = {
      id: item.id,
      name: item.name
    }
    dialog.value = true
  }

  async function viewPermissions(item: RoleWithCount) {
    selectedRole.value = item
    await loadRolePermissions(item.id)
    permissionsDialog.value = true
  }

  async function viewRoleUsers(item: RoleWithCount) {
    selectedRole.value = item
    await loadRoleUsers(item.id)
    usersDialog.value = true
  }

  function confirmDelete(item: RoleWithCount) {
    roleToDelete.value = item
    forceDelete.value = false
    deleteDialog.value = true
  }

  async function remove() {
    if (!roleToDelete.value) return
    
    deleting.value = true
    try {
      await api.delete(`/roles/${roleToDelete.value.id}`, {
        params: { force: forceDelete.value }
      })
      await loadRoles()
      deleteDialog.value = false
      roleToDelete.value = null
      forceDelete.value = false
      showNotification('Rol eliminado correctamente')
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al eliminar rol'
      showNotification(message, 'error')
    } finally {
      deleting.value = false
    }
  }

  function closeDialog() {
    dialog.value = false
    if (formRef.value) {
      formRef.value.reset()
    }
  }

  async function save() {
    if (!formRef.value) return
    
    const { valid } = await formRef.value.validate()
    if (!valid) return

    saving.value = true
    try {
      if (isEditing.value) {
        await api.put(`/roles/${formModel.value.id}`, {
          name: formModel.value.name
        })
        showNotification('Rol actualizado correctamente')
      } else {
        await api.post("/roles", {
          name: formModel.value.name
        })
        showNotification('Rol creado correctamente')
      }
      await loadRoles()
      closeDialog()
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al guardar rol'
      showNotification(message, 'error')
    } finally {
      saving.value = false
    }
  }

  // Lifecycle
  onMounted(() => {
    loadRoles()
  })
</script>

<style scoped>
.v-data-table {
  font-size: 0.875rem;
}
</style>
