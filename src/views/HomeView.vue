<template>
  <v-container fluid>
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card elevation="0" color="transparent">
          <v-card-text class="pa-0">
            <h1 class="text-h4 font-weight-medium mb-2">
              Bienvenido al Sistema de Gestión
            </h1>
            <p class="text-body-1 text-medium-emphasis">
              Ministerio de Minas y Energía - República de Colombia
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Sección principal de módulos -->
    <v-row class="mt-6">
      <!-- Usuarios -->
      <v-col cols="12" md="6" lg="4" v-if="authStore.canPerform('USERS', 'list')">
        <v-card elevation="2" hover :to="'/users'" class="h-100">
          <v-card-text class="pa-6">
            <div class="d-flex align-center mb-3">
              <v-avatar color="primary" variant="tonal" size="56">
                <v-icon size="32">mdi-account-group</v-icon>
              </v-avatar>
              <h3 class="text-h6 ml-4">Usuarios</h3>
            </div>
            <p class="text-body-2 text-medium-emphasis">
              Administración de usuarios del sistema, roles, permisos y accesos
            </p>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Roles -->
      <v-col cols="12" md="6" lg="4" v-if="authStore.canPerform('ROLES', 'list')">
        <v-card elevation="2" hover :to="'/roles'" class="h-100">
          <v-card-text class="pa-6">
            <div class="d-flex align-center mb-3">
              <v-avatar color="orange" variant="tonal" size="56">
                <v-icon size="32">mdi-shield-account</v-icon>
              </v-avatar>
              <h3 class="text-h6 ml-4">Roles</h3>
            </div>
            <p class="text-body-2 text-medium-emphasis">
              Gestión de roles y permisos del sistema
            </p>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Aplicaciones -->
      <v-col cols="12" md="6" lg="4" v-if="authStore.canViewApplications">
        <v-card elevation="2" hover :to="'/applications'" class="h-100">
          <v-card-text class="pa-6">
            <div class="d-flex align-center mb-3">
              <v-avatar color="purple" variant="tonal" size="56">
                <v-icon size="32">mdi-apps</v-icon>
              </v-avatar>
              <h3 class="text-h6 ml-4">
                {{ authStore.isApplicationsReadOnly ? 'Mis aplicaciones' : 'Aplicaciones' }}
              </h3>
            </div>
            <p class="text-body-2 text-medium-emphasis">
              {{
                authStore.isApplicationsReadOnly
                  ? 'Consulta las aplicaciones y rutas del gateway a las que tiene acceso'
                  : 'Gestión de aplicaciones y asignación de usuarios'
              }}
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Segunda fila de módulos -->
    <v-row class="mt-4">
      <!-- Configuraciones -->
      <v-col cols="12" md="6" lg="4">
        <v-card elevation="2" hover @click="toggleConfig" class="h-100">
          <v-card-text class="pa-6">
            <div class="d-flex align-center mb-3">
              <v-avatar color="success" variant="tonal" size="56">
                <v-icon size="32">mdi-cog</v-icon>
              </v-avatar>
              <h3 class="text-h6 ml-4">Configuraciones</h3>
              <v-spacer></v-spacer>
              <v-icon :class="{ 'rotate-icon': showConfig }">
                mdi-chevron-down
              </v-icon>
            </div>
            <p class="text-body-2 text-medium-emphasis">
              Configuración del sistema, entidades y parámetros generales
            </p>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Integradores -->
      <v-col cols="12" md="6" lg="4" v-if="authStore.canPerform('INTEGRATORS', 'list')">
        <v-card elevation="2" hover :to="'/integrators'" class="h-100">
          <v-card-text class="pa-6">
            <div class="d-flex align-center mb-3">
              <v-avatar color="blue" variant="tonal" size="56">
                <v-icon size="32">mdi-api</v-icon>
              </v-avatar>
              <h3 class="text-h6 ml-4">Integradores</h3>
            </div>
            <p class="text-body-2 text-medium-emphasis">
              Configuración de integraciones y APIs externas
            </p>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Reportes -->
      <v-col cols="12" md="6" lg="4">
        <v-card elevation="2" hover :to="'/monitoring'" class="h-100">
          <v-card-text class="pa-6">
            <div class="d-flex align-center mb-3">
              <v-avatar color="info" variant="tonal" size="56">
                <v-icon size="32">mdi-chart-bar</v-icon>
              </v-avatar>
              <h3 class="text-h6 ml-4">Reportes</h3>
            </div>
            <p class="text-body-2 text-medium-emphasis">
              Informes, estadísticas y auditoría del sistema
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Submenu expandible de Configuraciones -->
    <v-expand-transition>
      <v-row v-if="showConfig" class="mt-2">
        <v-col cols="12">
          <v-card elevation="1" color="success-lighten-5" class="ml-0 ml-md-4">
            <v-card-text class="py-6">
              <div class="d-flex align-center mb-4">
                <v-icon color="success" size="small" class="mr-2">mdi-chevron-right</v-icon>
                <p class="text-subtitle-1 text-success mb-0 font-weight-bold">
                  Opciones de Configuración
                </p>
              </div>
              
              <v-row>
                <!-- Entidades -->
                <v-col cols="12" sm="6" md="4" lg="3" v-if="authStore.canPerform('ENTITIES', 'list')">
                  <v-card 
                    elevation="2" 
                    hover 
                    :to="'/entities'"
                    class="config-card h-100"
                  >
                    <v-card-text class="pa-5">
                      <div class="d-flex align-center mb-2">
                        <v-icon color="success" size="40" class="mr-3">
                          mdi-office-building
                        </v-icon>
                        <h4 class="text-subtitle-1 font-weight-bold">
                          Entidades
                        </h4>
                      </div>
                      <p class="text-caption text-medium-emphasis mb-0">
                        Gestionar entidades del sistema
                      </p>
                    </v-card-text>
                  </v-card>
                </v-col>

                <!-- Headers -->
                <v-col cols="12" sm="6" md="4" lg="3">
                  <v-card 
                    elevation="2" 
                    hover
                    :to="'/headers'"
                    class="config-card h-100"
                  >
                    <v-card-text class="pa-5">
                      <div class="d-flex align-center mb-2">
                        <v-icon color="success" size="40" class="mr-3">
                          mdi-format-header-1
                        </v-icon>
                        <h4 class="text-subtitle-1 font-weight-bold">
                          Headers
                        </h4>
                      </div>
                      <p class="text-caption text-medium-emphasis mb-0">
                        Configuración de headers HTTP
                      </p>
                    </v-card-text>
                  </v-card>
                </v-col>

                <!-- Tipos de Seguridad -->
                <v-col cols="12" sm="6" md="4" lg="3">
                  <v-card 
                    elevation="2" 
                    hover
                    :to="'/security-types'"
                    class="config-card h-100"
                  >
                    <v-card-text class="pa-5">
                      <div class="d-flex align-center mb-2">
                        <v-icon color="success" size="40" class="mr-3">
                          mdi-shield-lock
                        </v-icon>
                        <h4 class="text-subtitle-1 font-weight-bold">
                          Seguridad
                        </h4>
                      </div>
                      <p class="text-caption text-medium-emphasis mb-0">
                        Tipos de seguridad y autenticación
                      </p>
                    </v-card-text>
                  </v-card>
                </v-col>

                <!-- Tipos de Conexión -->
                <v-col cols="12" sm="6" md="4" lg="3">
                  <v-card 
                    elevation="2" 
                    hover
                    :to="'/connection-types'"
                    class="config-card h-100"
                  >
                    <v-card-text class="pa-5">
                      <div class="d-flex align-center mb-2">
                        <v-icon color="success" size="40" class="mr-3">
                          mdi-lan-connect
                        </v-icon>
                        <h4 class="text-subtitle-1 font-weight-bold">
                          Conexiones
                        </h4>
                      </div>
                      <p class="text-caption text-medium-emphasis mb-0">
                        Tipos de conexión (REST, SOAP)
                      </p>
                    </v-card-text>
                  </v-card>
                </v-col>

                <!-- Asociaciones -->
                <v-col cols="12" sm="6" md="4" lg="3">
                  <v-card 
                    elevation="2" 
                    hover
                    :to="'/application-associations'"
                    class="config-card h-100"
                  >
                    <v-card-text class="pa-5">
                      <div class="d-flex align-center mb-2">
                        <v-icon color="success" size="40" class="mr-3">
                          mdi-link-variant
                        </v-icon>
                        <h4 class="text-subtitle-1 font-weight-bold">
                          Asociaciones
                        </h4>
                      </div>
                      <p class="text-caption text-medium-emphasis mb-0">
                        Gestión de relaciones del sistema
                      </p>
                    </v-card-text>
                  </v-card>
                </v-col>

                <!-- Parámetros Generales -->
                <v-col cols="12" sm="6" md="4" lg="3">
                  <v-card 
                    elevation="2" 
                    hover
                    :to="'/application-parameters'"
                    class="config-card h-100"
                  >
                    <v-card-text class="pa-5">
                      <div class="d-flex align-center mb-2">
                        <v-icon color="success" size="40" class="mr-3">
                          mdi-tune
                        </v-icon>
                        <h4 class="text-subtitle-1 font-weight-bold">
                          Parámetros
                        </h4>
                      </div>
                      <p class="text-caption text-medium-emphasis mb-0">
                        Configuración general del sistema
                      </p>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-expand-transition>

    <!-- Card informativa -->
    <v-row class="mt-8">
      <v-col cols="12">
        <v-card elevation="1" color="blue-grey-lighten-5">
          <v-card-text class="pa-6">
            <div class="d-flex align-center">
              <v-avatar color="info" size="48" variant="tonal" class="mr-4">
                <v-icon size="28">mdi-information</v-icon>
              </v-avatar>
              <div>
                <h4 class="text-subtitle-1 font-weight-bold mb-1">
                  Información del Sistema
                </h4>
                <p class="text-body-2 mb-0 text-medium-emphasis">
                  Este sistema permite gestionar usuarios, roles, aplicaciones e integradores. 
                  Utiliza el menú superior o las tarjetas para acceder a las diferentes secciones.
                </p>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Estadísticas rápidas con datos reales -->
    <v-row class="mt-6">
      <v-col cols="12">
        <p class="text-subtitle-1 font-weight-medium mb-4">
          <v-icon class="mr-2">mdi-chart-line</v-icon>
          Estadísticas Rápidas
        </p>
      </v-col>
      
      <v-col cols="12" sm="6" md="3" v-if="authStore.canPerform('USERS', 'list')">
        <v-card elevation="1" color="primary-lighten-5">
          <v-card-text class="text-center pa-4">
            <v-icon size="40" color="primary" class="mb-2">mdi-account-multiple</v-icon>
            <p class="text-h4 font-weight-bold mb-1">
              <span v-if="loadingStats">
                <v-progress-circular indeterminate size="24" width="2"></v-progress-circular>
              </span>
              <span v-else>{{ stats.users }}</span>
            </p>
            <p class="text-body-2 text-medium-emphasis mb-0">Usuarios Activos</p>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3" v-if="authStore.canPerform('ROLES', 'list')">
        <v-card elevation="1" color="orange-lighten-5">
          <v-card-text class="text-center pa-4">
            <v-icon size="40" color="orange" class="mb-2">mdi-shield-account</v-icon>
            <p class="text-h4 font-weight-bold mb-1">
              <span v-if="loadingStats">
                <v-progress-circular indeterminate size="24" width="2"></v-progress-circular>
              </span>
              <span v-else>{{ stats.roles }}</span>
            </p>
            <p class="text-body-2 text-medium-emphasis mb-0">Roles Configurados</p>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3" v-if="authStore.canViewApplications">
        <v-card elevation="1" color="purple-lighten-5">
          <v-card-text class="text-center pa-4">
            <v-icon size="40" color="purple" class="mb-2">mdi-apps</v-icon>
            <p class="text-h4 font-weight-bold mb-1">
              <span v-if="loadingStats">
                <v-progress-circular indeterminate size="24" width="2"></v-progress-circular>
              </span>
              <span v-else>{{ stats.applications }}</span>
            </p>
            <p class="text-body-2 text-medium-emphasis mb-0">Aplicaciones</p>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3" v-if="authStore.canPerform('INTEGRATORS', 'list')">
        <v-card elevation="1" color="blue-lighten-5">
          <v-card-text class="text-center pa-4">
            <v-icon size="40" color="blue" class="mb-2">mdi-api</v-icon>
            <p class="text-h4 font-weight-bold mb-1">
              <span v-if="loadingStats">
                <v-progress-circular indeterminate size="24" width="2"></v-progress-circular>
              </span>
              <span v-else>{{ stats.integrators }}</span>
            </p>
            <p class="text-body-2 text-medium-emphasis mb-0">Integradores</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/api/http'

const authStore = useAuthStore()
const showConfig = ref(false)
const loadingStats = ref(false)

const stats = ref({
  users: 0,
  roles: 0,
  applications: 0,
  integrators: 0
})

const toggleConfig = () => {
  showConfig.value = !showConfig.value
}

async function loadStats() {
  loadingStats.value = true
  try {
    // Helper para extraer array de respuesta paginada o directa
    const extractArray = (data: any) => {
      if (!data.resultObj) return []
      if (data.resultObj.items && Array.isArray(data.resultObj.items)) {
        return data.resultObj.items
      }
      if (Array.isArray(data.resultObj)) {
        return data.resultObj
      }
      return []
    }

    // Cargar estadísticas de usuarios
    if (authStore.canPerform('USERS', 'list')) {
      try {
        const { data: usersData } = await api.get('/users')
        const users = extractArray(usersData)
        stats.value.users = users.filter((u: any) => u.is_active).length || 0
      } catch (error) {
        console.error('Error loading users stats:', error)
        stats.value.users = 0
      }
    }

    // Cargar estadísticas de roles
    if (authStore.canPerform('ROLES', 'list')) {
      try {
        const { data: rolesData } = await api.get('/roles')
        stats.value.roles = extractArray(rolesData).length || 0
      } catch (error) {
        console.error('Error loading roles stats:', error)
        stats.value.roles = 0
      }
    }

    // Cargar estadísticas de aplicaciones
    if (authStore.canViewApplications) {
      try {
        const { data: appsData } = await api.get('/applications')
        stats.value.applications = extractArray(appsData).length || 0
      } catch (error) {
        console.error('Error loading applications stats:', error)
        stats.value.applications = 0
      }
    }

    // Cargar estadísticas de integradores
    if (authStore.canPerform('INTEGRATORS', 'list')) {
      try {
        const { data: integData } = await api.get('/integrators')
        stats.value.integrators = extractArray(integData).length || 0
      } catch (error) {
        console.error('Error loading integrators stats:', error)
        stats.value.integrators = 0
      }
    }
  } catch (error) {
    console.error('Error loading stats:', error)
  } finally {
    loadingStats.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.rotate-icon {
  transition: transform 0.3s ease;
  transform: rotate(180deg);
}

.config-card {
  transition: all 0.3s ease;
  border-left: 4px solid transparent;
}

.config-card:hover {
  border-left-color: rgb(var(--v-theme-success));
  transform: translateX(6px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.h-100 {
  height: 100%;
}

/* Animación suave para las cards */
.v-card {
  transition: all 0.3s ease;
}

.v-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2) !important;
}
</style>