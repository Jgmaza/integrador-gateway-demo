<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card elevation="2" rounded="lg">
          <v-card-title class="d-flex align-center pa-6">
            <v-icon color="primary" size="32" class="mr-3">mdi-account-group</v-icon>
            <span class="text-h5 font-weight-bold">Gestión de Usuarios</span>
            <v-spacer></v-spacer>
            <v-btn
              v-if="authStore.canCreateUsers"
              color="primary"
              prepend-icon="mdi-plus"
              @click="add"
              elevation="0"
            >
              Crear Usuario
            </v-btn>
          </v-card-title>

          <v-divider></v-divider>

          <!-- Filtros -->
          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12" md="3">
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
              <v-col cols="12" md="3">
                <v-select
                  v-model="filterRole"
                  :items="rolesForFilter"
                  item-title="name"
                  item-value="id"
                  label="Filtrar por Rol"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                ></v-select>
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="filterEntity"
                  :items="entities"
                  item-title="name"
                  item-value="id"
                  label="Filtrar por Entidad"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                ></v-select>
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="filterStatus"
                  :items="statusOptions"
                  item-title="text"
                  item-value="value"
                  label="Estado"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                ></v-select>
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider></v-divider>

          <v-data-table
            :headers="headers"
            :items="filteredUsers"
            :items-per-page="10"
            :loading="loading"
            class="elevation-0"
          >
            <template v-slot:item.email="{ item }">
              <div class="d-flex align-center py-2">
                <v-avatar color="primary" size="32" class="mr-3">
                  <v-icon size="18" color="white">mdi-account</v-icon>
                </v-avatar>
                <div>
                  <span class="font-weight-medium">{{ item.email }}</span>
                  <div v-if="item.full_name" class="text-caption text-medium-emphasis">
                    {{ item.full_name }}
                  </div>
                </div>
              </div>
            </template>

            <template v-slot:item.role="{ item }">
              <v-chip
                v-if="item.is_superuser"
                color="error"
                size="small"
                variant="tonal"
                prepend-icon="mdi-shield-crown"
              >
                Superuser
              </v-chip>
              <v-chip
                v-else-if="getRoleName(item.role_id)"
                :color="getRoleColor(getRoleName(item.role_id))"
                size="small"
                variant="tonal"
              >
                {{ getRoleName(item.role_id) }}
              </v-chip>
              <span v-else class="text-medium-emphasis">Sin rol</span>
            </template>

            <template v-slot:item.entity="{ item }">
              <span v-if="getEntityName(item.entity_id)">
                {{ getEntityName(item.entity_id) }}
              </span>
              <span v-else class="text-medium-emphasis">-</span>
            </template>

            <template v-slot:item.applications="{ item }">
              <div v-if="item.applications && item.applications.length > 0">
                <v-chip
                  v-for="(app, index) in item.applications.slice(0, 2)"
                  :key="app.id"
                  size="x-small"
                  variant="tonal"
                  color="primary"
                  class="mr-1 mb-1"
                >
                  {{ app.name }}
                </v-chip>
                <v-chip
                  v-if="item.applications.length > 2"
                  size="x-small"
                  variant="outlined"
                  color="primary"
                >
                  +{{ item.applications.length - 2 }}
                </v-chip>
              </div>
              <span v-else class="text-medium-emphasis">-</span>
            </template>

            <template v-slot:item.is_active="{ value }">
              <v-chip
                :color="value ? 'success' : 'error'"
                :text="value ? 'Activo' : 'Inactivo'"
                size="small"
                variant="tonal"
              ></v-chip>
            </template>

            <template v-slot:item.actions="{ item }">
              <div class="d-flex justify-end ga-1">
                <v-btn
                  icon="mdi-eye"
                  size="small"
                  variant="text"
                  color="info"
                  @click="viewDetails(item)"
                  title="Ver detalles"
                ></v-btn>
                
                <v-btn
                  v-if="authStore.canUpdateUsers"
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  color="primary"
                  @click="edit(item.id)"
                  title="Editar"
                ></v-btn>
                
                <v-btn
                  v-if="authStore.canActivateUsers && item.id !== authStore.currentUser?.id"
                  :icon="item.is_active ? 'mdi-account-off' : 'mdi-account-check'"
                  size="small"
                  variant="text"
                  :color="item.is_active ? 'warning' : 'success'"
                  @click="toggleUserStatus(item)"
                  :title="item.is_active ? 'Desactivar' : 'Activar'"
                ></v-btn>
                
                <v-btn
                  v-if="authStore.canDeleteUsers && item.id !== authStore.currentUser?.id"
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
                <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-off</v-icon>
                <p class="text-h6 text-medium-emphasis mb-4">No hay usuarios registrados</p>
                <v-btn
                  v-if="authStore.canCreateUsers"
                  color="primary"
                  prepend-icon="mdi-plus"
                  @click="add"
                  variant="outlined"
                >
                  Crear Primer Usuario
                </v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diálogo Crear/Editar Usuario -->
    <v-dialog v-model="dialog" max-width="700" persistent>
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center bg-primary pa-4">
          <v-icon color="white" class="mr-2">
            {{ isEditing ? 'mdi-pencil' : 'mdi-plus' }}
          </v-icon>
          <span class="text-h6 text-white">
            {{ isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario' }}
          </span>
        </v-card-title>

        <v-form ref="formRef" v-model="formValid" @submit.prevent="save">
          <v-card-text class="pt-6">
            <v-row>
              <v-col cols="12" v-if="!isEditing">
                <v-text-field
                  v-model="formModel.email"
                  label="Correo electrónico"
                  type="email"
                  prepend-inner-icon="mdi-email"
                  variant="outlined"
                  color="primary"
                  :rules="emailRules"
                  required
                ></v-text-field>
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="formModel.full_name"
                  label="Nombre Completo"
                  prepend-inner-icon="mdi-account"
                  variant="outlined"
                  color="primary"
                  :rules="nameRules"
                  required
                ></v-text-field>
              </v-col>

              <v-col cols="12" v-if="!isEditing">
                <v-text-field
                  v-model="formModel.password"
                  label="Contraseña"
                  :type="showPassword ? 'text' : 'password'"
                  prepend-inner-icon="mdi-lock"
                  :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                  @click:append-inner="showPassword = !showPassword"
                  variant="outlined"
                  color="primary"
                  :rules="passwordRules"
                  required
                  @input="checkPasswordStrength"
                ></v-text-field>
                
                <!-- Indicador de fortaleza de contraseña -->
                <div class="password-strength-container ml-4 mt-2">
                  <div class="d-flex align-center mb-2">
                    <span class="text-caption text-medium-emphasis mr-2">Fortaleza:</span>
                    <v-progress-linear
                      :model-value="passwordStrength.score"
                      :color="passwordStrength.color"
                      height="6"
                      rounded
                      class="flex-grow-1"
                    ></v-progress-linear>
                    <span class="text-caption ml-2" :style="{ color: passwordStrength.color }">
                      {{ passwordStrength.label }}
                    </span>
                  </div>
                  
                  <!-- Lista de requisitos -->
                  <div class="text-caption">
                    <div class="d-flex align-center mb-1" :style="{ color: passwordChecks.length ? 'green' : 'grey' }">
                      <v-icon size="12" class="mr-1">
                        {{ passwordChecks.length ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                      </v-icon>
                      <span>Mínimo 8 caracteres</span>
                    </div>
                    <div class="d-flex align-center mb-1" :style="{ color: passwordChecks.uppercase ? 'green' : 'grey' }">
                      <v-icon size="12" class="mr-1">
                        {{ passwordChecks.uppercase ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                      </v-icon>
                      <span>Al menos una mayúscula</span>
                    </div>
                    <div class="d-flex align-center mb-1" :style="{ color: passwordChecks.lowercase ? 'green' : 'grey' }">
                      <v-icon size="12" class="mr-1">
                        {{ passwordChecks.lowercase ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                      </v-icon>
                      <span>Al menos una minúscula</span>
                    </div>
                    <div class="d-flex align-center" :style="{ color: passwordChecks.number ? 'green' : 'grey' }">
                      <v-icon size="12" class="mr-1">
                        {{ passwordChecks.number ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                      </v-icon>
                      <span>Al menos un número</span>
                    </div>
                  </div>
                </div>
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="formModel.role_id"
                  :items="roles"
                  item-title="name"
                  item-value="id"
                  label="Rol"
                  prepend-inner-icon="mdi-shield-account"
                  variant="outlined"
                  color="primary"
                  clearable
                  :disabled="!authStore.canManageRoles"
                ></v-select>
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="formModel.entity_id"
                  :items="entities"
                  item-title="name"
                  item-value="id"
                  label="Entidad"
                  prepend-inner-icon="mdi-domain"
                  variant="outlined"
                  color="primary"
                  clearable
                ></v-select>
              </v-col>

              <!-- Aplicaciones -->
              <v-col cols="12">
                <v-autocomplete
                  v-model="formModel.application_ids"
                  :items="applications"
                  item-title="name"
                  item-value="id"
                  label="Aplicaciones"
                  prepend-inner-icon="mdi-apps"
                  variant="outlined"
                  color="primary"
                  multiple
                  chips
                  closable-chips
                  clearable
                >
                  <template v-slot:chip="{ props, item }">
                    <v-chip
                      v-bind="props"
                      size="small"
                      variant="tonal"
                      color="primary"
                    >
                      {{ item.raw.name }}
                    </v-chip>
                  </template>
                </v-autocomplete>
              </v-col>

              <!-- Integradores -->
              <v-col cols="12">
                <v-autocomplete
                  v-model="formModel.integrator_ids"
                  :items="integrators"
                  item-title="url_destination"
                  item-value="id"
                  label="Integradores"
                  prepend-inner-icon="mdi-connection"
                  variant="outlined"
                  color="primary"
                  multiple
                  chips
                  closable-chips
                  clearable
                  :disabled="!authStore.canManageIntegrators"
                >
                  <template v-slot:chip="{ props, item }">
                    <v-chip
                      v-bind="props"
                      size="small"
                      variant="outlined"
                    >
                      {{ truncateUrl(item.raw.url_destination) }}
                    </v-chip>
                  </template>
                </v-autocomplete>
              </v-col>

              <v-col cols="12" md="6">
                <v-checkbox
                  v-model="formModel.is_active"
                  label="Usuario Activo"
                  color="primary"
                  hide-details
                ></v-checkbox>
              </v-col>

              <v-col cols="12" md="6">
                <v-checkbox
                  v-model="formModel.is_superuser"
                  label="Super Usuario"
                  color="error"
                  hide-details
                  :disabled="!authStore.currentUser?.is_superuser"
                >
                  <template v-slot:label>
                    <div class="d-flex align-center">
                      <v-icon size="small" class="mr-1" color="error">mdi-shield-crown</v-icon>
                      Super Usuario
                    </div>
                  </template>
                </v-checkbox>
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider></v-divider>

          <v-card-actions class="pa-4">
            <v-btn variant="text" @click="closeDialog">Cancelar</v-btn>
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

    <!-- Diálogo Ver Detalles -->
    <v-dialog v-model="detailsDialog" max-width="600">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center bg-info pa-4">
          <v-icon color="white" class="mr-2">mdi-account-details</v-icon>
          <span class="text-h6 text-white">Detalles del Usuario</span>
        </v-card-title>

        <v-card-text class="pt-6" v-if="userDetails">
          <v-list>
            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-email</v-icon>
              </template>
              <v-list-item-title>Email</v-list-item-title>
              <v-list-item-subtitle>{{ userDetails.email }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-account</v-icon>
              </template>
              <v-list-item-title>Nombre Completo</v-list-item-title>
              <v-list-item-subtitle>{{ userDetails.full_name || 'No especificado' }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-shield-account</v-icon>
              </template>
              <v-list-item-title>Rol</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip v-if="userDetails.is_superuser" color="error" size="small" variant="tonal">
                  Superuser
                </v-chip>
                <span v-else>{{ getRoleName(userDetails.role_id) || 'Sin rol asignado' }}</span>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-domain</v-icon>
              </template>
              <v-list-item-title>Entidad</v-list-item-title>
              <v-list-item-subtitle>{{ getEntityName(userDetails.entity_id) || 'Sin entidad' }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-check-circle</v-icon>
              </template>
              <v-list-item-title>Estado</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip :color="userDetails.is_active ? 'success' : 'error'" size="small" variant="tonal">
                  {{ userDetails.is_active ? 'Activo' : 'Inactivo' }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="userDetails.applications && userDetails.applications.length > 0">
              <template v-slot:prepend>
                <v-icon color="primary">mdi-apps</v-icon>
              </template>
              <v-list-item-title>Aplicaciones ({{ userDetails.applications.length }})</v-list-item-title>
              <v-list-item-subtitle>
                <div class="mt-2">
                  <v-chip
                    v-for="app in userDetails.applications"
                    :key="app.id"
                    size="small"
                    variant="tonal"
                    color="primary"
                    class="mr-1 mb-1"
                  >
                    {{ app.name }}
                  </v-chip>
                </div>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="userDetails.integrators && userDetails.integrators.length > 0">
              <template v-slot:prepend>
                <v-icon color="primary">mdi-connection</v-icon>
              </template>
              <v-list-item-title>Integradores ({{ userDetails.integrators.length }})</v-list-item-title>
              <v-list-item-subtitle>
                <div class="mt-2">
                  <v-chip
                    v-for="integrator in userDetails.integrators"
                    :key="integrator.id"
                    size="small"
                    variant="outlined"
                    class="mr-1 mb-1"
                  >
                    {{ integrator.url_destination }}
                  </v-chip>
                </div>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="detailsDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo Confirmar Eliminación -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center bg-error pa-4">
          <v-icon color="white" class="mr-2">mdi-alert</v-icon>
          <span class="text-h6 text-white">Confirmar Eliminación</span>
        </v-card-title>

        <v-card-text class="pt-6">
          <p class="text-body-1">
            ¿Estás seguro de que deseas eliminar al usuario 
            <strong>{{ userToDelete?.email }}</strong>?
          </p>
          <p class="text-body-2 text-medium-emphasis mt-2">
            Esta acción no se puede deshacer.
          </p>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="error" variant="elevated" @click="remove" :loading="deleting">
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
  import { onMounted, ref, shallowRef, toRef, computed } from 'vue'
  import type { User, Role, Entity, Integrator, Application } from "@/types"
  import api from "@/api/http"
  import { useAuthStore } from "@/stores/auth.store"

  const authStore = useAuthStore()

  function createNewRecord() {
    return {
      id: null as number | null,
      email: '',
      full_name: '',
      is_active: true,
      is_superuser: false,
      password: '',
      role_id: null as number | null,
      entity_id: null as number | null,
      integrator_ids: [] as number[],
      application_ids: [] as number[]
    }
  }

  // State
  const users = ref<User[]>([])
  const roles = ref<Role[]>([])
  const entities = ref<Entity[]>([])
  const integrators = ref<Integrator[]>([])
  const applications = ref<Application[]>([])
  const formModel = ref(createNewRecord())
  const dialog = shallowRef(false)
  const deleteDialog = shallowRef(false)
  const detailsDialog = shallowRef(false)
  const userToDelete = ref<User | null>(null)
  const userDetails = ref<User | null>(null)
  const isEditing = toRef(() => !!formModel.value.id)
  const showPassword = ref(false)
  const saving = ref(false)
  const deleting = ref(false)
  const loading = ref(false)
  const formRef = ref<any>(null)
  const formValid = ref(false)

  // Password strength
  const passwordChecks = ref({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false
  })

  const passwordStrength = computed(() => {
    const checks = Object.values(passwordChecks.value).filter(Boolean).length
    if (checks === 0) return { score: 0, label: '', color: 'grey' }
    if (checks === 1) return { score: 25, label: 'Débil', color: 'error' }
    if (checks === 2) return { score: 50, label: 'Regular', color: 'warning' }
    if (checks === 3) return { score: 75, label: 'Buena', color: 'info' }
    return { score: 100, label: 'Fuerte', color: 'success' }
  })

  // Filtros
  const searchQuery = ref('')
  const filterRole = ref<number | null>(null)
  const filterEntity = ref<number | null>(null)
  const filterStatus = ref<boolean | null>(null)

  // Snackbar
  const snackbar = ref({ show: false, message: '', color: 'success' })

  const statusOptions = [
    { text: 'Activo', value: true },
    { text: 'Inactivo', value: false }
  ]

  // Computed
  const rolesForFilter = computed(() => [{ id: -1, name: 'Superuser' }, ...roles.value])

  const filteredUsers = computed(() => {
    let result = users.value

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(u => 
        u.email.toLowerCase().includes(query) ||
        (u.full_name && u.full_name.toLowerCase().includes(query))
      )
    }

    if (filterRole.value !== null) {
      if (filterRole.value === -1) {
        result = result.filter(u => u.is_superuser)
      } else {
        result = result.filter(u => u.role_id === filterRole.value)
      }
    }

    if (filterEntity.value !== null) {
      result = result.filter(u => u.entity_id === filterEntity.value)
    }

    if (filterStatus.value !== null) {
      result = result.filter(u => u.is_active === filterStatus.value)
    }

    return result
  })

  // Validaciones que coinciden exactamente con el backend
  const emailRules = [
    (v: string) => !!v || 'El correo electrónico es requerido',
    (v: string) => /.+@.+\..+/.test(v) || 'El correo electrónico debe ser válido',
  ]

  const nameRules = [
    (v: string) => !!v || 'El nombre es requerido',
    (v: string) => v.length >= 3 || 'El nombre debe tener al menos 3 caracteres',
  ]

  // Reglas de contraseña que coinciden exactamente con el backend Python
  const passwordRules = [
    (v: string) => !!v || 'La contraseña es requerida',
    (v: string) => v.length >= 8 || 'Password must be at least 8 characters long',
    (v: string) => /[A-Z]/.test(v) || 'Password must contain at least one uppercase letter',
    (v: string) => /[a-z]/.test(v) || 'Password must contain at least one lowercase letter',
    (v: string) => /\d/.test(v) || 'Password must contain at least one number',
  ]

  // Función para verificar fortaleza de contraseña
  function checkPasswordStrength() {
    const pwd = formModel.value.password
    passwordChecks.value = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /\d/.test(pwd)
    }
  }

  const headers = [
    { title: 'Usuario', key: 'email', align: 'start' as const },
    { title: 'Rol', key: 'role', align: 'center' as const },
    { title: 'Entidad', key: 'entity', align: 'center' as const },
    { title: 'Aplicaciones', key: 'applications', align: 'center' as const },
    { title: 'Estado', key: 'is_active', align: 'center' as const },
    { title: 'Acciones', key: 'actions', align: 'end' as const, sortable: false },
  ]

  // Helpers
  function getRoleName(roleId: number | null): string {
    if (!roleId) return ''
    const role = roles.value.find(r => r.id === roleId)
    return role?.name || ''
  }

  function getEntityName(entityId: number | null): string {
    if (!entityId) return ''
    const entity = entities.value.find(e => e.id === entityId)
    return entity?.name || ''
  }

  function getRoleColor(roleName: string): string {
    const colors: Record<string, string> = {
      'admin': 'orange',
      'manager': 'blue',
      'viewer': 'green',
      'superuser': 'error'
    }
    return colors[roleName.toLowerCase()] || 'grey'
  }

  function truncateUrl(url: string): string {
    return url.length > 30 ? url.substring(0, 27) + '...' : url
  }

  function showNotification(message: string, color: string = 'success') {
    snackbar.value = { show: true, message, color }
  }

  // API calls
  async function loadData() {
    loading.value = true
    try {
      await Promise.all([
        loadUsers(),
        loadRoles(),
        loadEntities(),
        loadIntegrators(),
        loadApplications()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      showNotification('Error al cargar datos', 'error')
    } finally {
      loading.value = false
    }
  }

  async function loadUsers() {
    const { data } = await api.get("/users", { params: { skip: 0, limit: 500 } })
    users.value = data['resultObj']
  }

  async function loadRoles() {
    try {
      const { data } = await api.get("/roles")
      roles.value = data['resultObj']
    } catch { roles.value = [] }
  }

  async function loadEntities() {
    try {
      const { data } = await api.get("/entities")
      entities.value = data['resultObj'].items || data['resultObj']
    } catch { entities.value = [] }
  }

  async function loadIntegrators() {
    try {
      const { data } = await api.get("/integrators")
      integrators.value = data['resultObj'].items || data['resultObj']
    } catch { integrators.value = [] }
  }

  async function loadApplications() {
    try {
      const { data } = await api.get("/applications")
      applications.value = data['resultObj'].items || data['resultObj']
    } catch { applications.value = [] }
  }

  // CRUD
  function add() {
    formModel.value = createNewRecord()
    passwordChecks.value = {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false
    }
    dialog.value = true
  }

  async function edit(id: number) {
    try {
      const { data } = await api.get("/users/" + id)
      const found = data['resultObj']
      formModel.value = {
        id: found.id,
        email: found.email,
        full_name: found.full_name || '',
        is_active: found.is_active,
        is_superuser: found.is_superuser,
        password: '',
        role_id: found.role_id,
        entity_id: found.entity_id,
        integrator_ids: found.integrators?.map((i: Integrator) => i.id) || [],
        application_ids: found.applications?.map((a: Application) => a.id) || []
      }
      dialog.value = true
    } catch (error) {
      showNotification('Error al cargar usuario', 'error')
    }
  }

  function viewDetails(item: User) {
    userDetails.value = item
    detailsDialog.value = true
  }

  function confirmDelete(item: User) {
    userToDelete.value = item
    deleteDialog.value = true
  }

  async function remove() {
    if (!userToDelete.value) return
    
    deleting.value = true
    try {
      await api.delete("/users/" + userToDelete.value.id)
      await loadUsers()
      deleteDialog.value = false
      userToDelete.value = null
      showNotification('Usuario eliminado correctamente')
    } catch (error) {
      showNotification('Error al eliminar usuario', 'error')
    } finally {
      deleting.value = false
    }
  }

  async function toggleUserStatus(user: User) {
    try {
      if (user.is_active) {
        await api.post(`/users/${user.id}/deactivate`)
        showNotification('Usuario desactivado correctamente')
      } else {
        await api.post(`/users/${user.id}/activate`)
        showNotification('Usuario activado correctamente')
      }
      await loadUsers()
    } catch (error) {
      showNotification('Error al cambiar estado del usuario', 'error')
    }
  }

  function closeDialog() {
    dialog.value = false
    if (formRef.value) formRef.value.reset()
    passwordChecks.value = {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false
    }
  }

  async function save() {
    if (!formRef.value) return
    
    const { valid } = await formRef.value.validate()
    if (!valid) return

    saving.value = true
    try {
      if (isEditing.value) {
        await api.put("/users/" + formModel.value.id, {
          full_name: formModel.value.full_name,
          is_active: formModel.value.is_active,
          is_superuser: formModel.value.is_superuser,
          role_id: formModel.value.role_id,
          entity_id: formModel.value.entity_id,
          integrator_ids: formModel.value.integrator_ids,
          application_ids: formModel.value.application_ids,
        })
        showNotification('Usuario actualizado correctamente')
      } else {
        await api.post("/users", {
          email: formModel.value.email,
          full_name: formModel.value.full_name,
          password: formModel.value.password,
          role_id: formModel.value.role_id,
          entity_id: formModel.value.entity_id,
          integrator_ids: formModel.value.integrator_ids,
          application_ids: formModel.value.application_ids,
        })
        showNotification('Usuario creado correctamente')
      }
      await loadUsers()
      closeDialog()
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al guardar usuario'
      showNotification(message, 'error')
    } finally {
      saving.value = false
    }
  }

  onMounted(() => {
    loadData()
  })
</script>

<style scoped>
.v-data-table {
  font-size: 0.875rem;
}

.password-strength-container {
  background-color: rgba(0, 0, 0, 0.02);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}
</style>