<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card elevation="2" rounded="lg">
          <!-- Header -->
          <v-card-title class="d-flex align-center pa-6">
            <v-icon color="purple" size="32" class="mr-3">mdi-apps</v-icon>
            <span class="text-h5 font-weight-bold">
              {{ isReadOnly ? 'Mis aplicaciones' : 'Gestión de Aplicaciones' }}
            </span>
            <v-spacer></v-spacer>
            <v-btn
              v-if="authStore.canPerform('APPLICATIONS', 'create')"
              color="purple"
              prepend-icon="mdi-plus"
              @click="openCreateDialog"
              elevation="0"
            >
              Crear Aplicación
            </v-btn>
          </v-card-title>

          <v-divider></v-divider>

          <v-alert
            v-if="isReadOnly"
            type="info"
            variant="tonal"
            class="ma-4 mb-0"
            density="compact"
          >
            Vista de solo lectura: puede consultar las aplicaciones asignadas y sus rutas en el gateway.
          </v-alert>

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
            :headers="tableHeaders"
            :items="filteredApplications"
            :items-per-page="10"
            :loading="loading"
            class="elevation-0"
          >
            <template v-slot:item.name="{ item }">
              <div class="d-flex align-center py-2">
                <v-avatar color="purple" size="32" class="mr-3">
                  <v-icon size="18" color="white">mdi-apps</v-icon>
                </v-avatar>
                <div>
                  <div class="font-weight-medium">{{ item.name }}</div>
                  <div class="text-caption text-medium-emphasis" v-if="item.url_domain">
                    {{ item.url_domain }}
                  </div>
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

            <template v-slot:item.call_type="{ item }">
              <v-chip size="small" :color="getCallTypeColor(item.call_type)">
                {{ item.call_type }}
              </v-chip>
            </template>

            <template v-slot:item.entity="{ item }">
              <span v-if="getEntityName(item.entity_id)" class="text-body-2">
                {{ getEntityName(item.entity_id) }}
              </span>
              <span v-else class="text-caption text-medium-emphasis">Sin entidad</span>
            </template>

            <template v-slot:item.users="{ item }">
              <v-chip
                size="small"
                color="blue"
                prepend-icon="mdi-account-multiple"
              >
                {{ item.users?.length || 0 }} usuarios
              </v-chip>
            </template>

            <template v-slot:item.actions="{ item }">
              <div class="d-flex justify-end ga-2">
                <v-tooltip text="Ver rutas del gateway" location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      icon="mdi-routes"
                      size="small"
                      variant="text"
                      color="purple"
                      v-bind="props"
                      @click="openRoutesDialog(item)"
                    ></v-btn>
                  </template>
                </v-tooltip>

                <v-tooltip v-if="!isReadOnly" text="Ver usuarios" location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      icon="mdi-account-multiple"
                      size="small"
                      variant="text"
                      color="blue"
                      v-bind="props"
                      @click="openUsersDialog(item)"
                    ></v-btn>
                  </template>
                </v-tooltip>

                <v-tooltip text="Editar" location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-if="authStore.canPerform('APPLICATIONS', 'update')"
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
                      v-if="authStore.canPerform('APPLICATIONS', 'delete')"
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

    <!-- Diálogo Crear/Editar Aplicación -->
    <v-dialog v-model="dialog" max-width="900" persistent scrollable>
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center bg-primary pa-4">
          <v-icon color="white" class="mr-2">
            {{ isEditing ? 'mdi-pencil' : 'mdi-plus' }}
          </v-icon>
          <span class="text-h6 text-white dialog-title-text">
            {{ isEditing ? 'Editar Aplicación' : 'Crear Nueva Aplicación' }}
          </span>
        </v-card-title>

        <!-- Info Banner -->
        <v-alert
          v-if="!isEditing"
          type="info"
          variant="outlined"
          class="ma-4 mb-2"
          density="compact"
        >
          <v-icon start size="small">mdi-information</v-icon>
          <span class="text-caption">
            Configura autenticación específica para servicios SOAP (Basic Auth) o REST (Bearer Token).
          </span>
        </v-alert>

        <v-form ref="formRef" v-model="formValid" @submit.prevent="save">
          <v-card-text class="pt-6">
            <v-expansion-panels v-model="formSectionsOpen" variant="accordion" multiple>
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon size="20" class="mr-2">mdi-information</v-icon>
                  Información Básica
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formModel.name"
                        label="Nombre"
                        prepend-inner-icon="mdi-application"
                        variant="outlined"
                        color="primary"
                        :rules="nameRules"
                        required
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formModel.url_domain"
                        label="Host del Upstream (Ej: httpbin.org:80)"
                        placeholder="servidor.com:puerto"
                        prepend-inner-icon="mdi-link"
                        variant="outlined"
                        color="primary"
                        hint="Formato: host:puerto (ej: 192.168.1.100:8080)"
                        persistent-hint
                        :rules="urlRules"
                        required
                      ></v-text-field>
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
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="formModel.call_type"
                        :items="callTypes"
                        label="Tipo de Llamada"
                        prepend-inner-icon="mdi-api"
                        variant="outlined"
                        color="primary"
                        :rules="[(v: string) => !!v || 'El tipo de llamada es requerido']"
                        required
                      ></v-select>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="formModel.security_type_id"
                        :items="securityTypes"
                        item-title="name"
                        item-value="id"
                        label="Tipo de Seguridad"
                        prepend-inner-icon="mdi-shield-lock"
                        variant="outlined"
                        color="primary"
                        clearable
                      ></v-select>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="formModel.connection_types_id"
                        :items="connectionTypes"
                        item-title="name"
                        item-value="id"
                        label="Tipo de Conexión"
                        prepend-inner-icon="mdi-connection"
                        variant="outlined"
                        color="primary"
                        clearable
                      ></v-select>
                    </v-col>
                  </v-row>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon size="20" class="mr-2">mdi-lock</v-icon>
                  Autenticación
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="formModel.auth_type"
                        :items="['none', 'basic', 'bearer', 'soap', 'custom_headers']"
                        label="Tipo de Autenticación"
                        prepend-inner-icon="mdi-lock-outline"
                        variant="outlined"
                        color="primary"
                      >
                        <template v-slot:item="{ props, item }">
                          <v-list-item v-bind="props" :title="formatAuthType(item.value as string)" :subtitle="getAuthTypeDescription(item.value as string)"></v-list-item>
                        </template>
                      </v-select>
                    </v-col>
                    <v-col v-if="['basic', 'bearer', 'soap'].includes(formModel.auth_type)" cols="12" md="6">
                      <v-text-field
                        v-model="formModel.auth_username"
                        label="Usuario"
                        prepend-inner-icon="mdi-account"
                        variant="outlined"
                        color="primary"
                      ></v-text-field>
                    </v-col>
                    <v-col v-if="['basic', 'bearer', 'soap'].includes(formModel.auth_type)" cols="12" md="6">
                      <v-text-field
                        v-model="formModel.auth_password"
                        label="Contraseña"
                        type="password"
                        prepend-inner-icon="mdi-lock"
                        variant="outlined"
                        color="primary"
                      ></v-text-field>
                    </v-col>
                    <v-col v-if="['bearer', 'custom_headers'].includes(formModel.auth_type)" cols="12">
                      <v-textarea
                        v-model="authConfigJson"
                        label="Configuración Adicional (JSON)"
                        hint='Ej: {"token_endpoint": "/wsToken", "token_field": "id_token"}'
                        prepend-inner-icon="mdi-code-json"
                        variant="outlined"
                        color="primary"
                        rows="3"
                        density="compact"
                      ></v-textarea>
                    </v-col>
                  </v-row>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon size="20" class="mr-2">mdi-format-list-bulleted</v-icon>
                  Headers Globales
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-textarea
                    v-model="headersGlobalesJson"
                    label="Headers Globales (JSON)"
                    hint='Ej: {"x-road-client": "CO/GOB/MINENERGIA-0009/EITI", "Accept": "application/json"}'
                    prepend-inner-icon="mdi-code-json"
                    variant="outlined"
                    color="primary"
                    rows="3"
                    density="compact"
                  ></v-textarea>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon size="20" class="mr-2">mdi-routes</v-icon>
                  Rutas Específicas
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <div class="d-flex align-center justify-space-between mb-4">
                    <div class="text-caption text-medium-emphasis">
                      Define rutas y su traducción de entrada/salida SOAP -> REST.
                    </div>
                    <v-btn
                      size="small"
                      color="primary"
                      prepend-icon="mdi-plus"
                      @click="addRuta"
                      variant="outlined"
                    >
                      Agregar Ruta
                    </v-btn>
                  </div>

                  <div v-if="formModel.rutas.length === 0" class="text-center py-4">
                    <v-icon size="40" color="grey-lighten-1" class="mb-2">mdi-route</v-icon>
                    <p class="text-caption text-medium-emphasis">
                      Sin rutas específicas. Se usará la ruta genérica: /api/services/app_{id}/*
                    </p>
                  </div>

                  <v-card
                    v-for="(ruta, index) in formModel.rutas"
                    :key="index"
                    class="mb-3"
                    variant="outlined"
                  >
                    <v-card-text class="pb-2">
                      <v-row dense>
                        <v-col cols="12" md="5">
                          <v-text-field
                            v-model="ruta.ruta_apisix"
                            label="Ruta en APISIX"
                            placeholder="/argo/radicar"
                            density="compact"
                            variant="outlined"
                            hint="Ej: /argo/radicar"
                            persistent-hint
                          ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="5">
                          <v-text-field
                            v-model="ruta.ruta_destino"
                            label="Ruta Destino"
                            placeholder="/webServices/servidor.php"
                            density="compact"
                            variant="outlined"
                            hint="Ruta en el servidor real"
                            persistent-hint
                          ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="2">
                          <v-select
                            v-model="ruta.metodos"
                            :items="['GET', 'POST', 'PUT', 'PATCH', 'DELETE']"
                            label="Método"
                            density="compact"
                            variant="outlined"
                          ></v-select>
                        </v-col>
                        <v-col cols="12">
                          <v-text-field
                            v-model="ruta.descripcion"
                            label="Descripción (Opcional)"
                            placeholder="Ej: Radicar documento en ARGO"
                            density="compact"
                            variant="outlined"
                          ></v-text-field>
                        </v-col>
                        <v-col cols="12">
                          <div class="d-flex align-center flex-wrap ga-2">
                            <v-btn
                              size="small"
                              color="secondary"
                              variant="tonal"
                              prepend-icon="mdi-swap-horizontal"
                              @click="openTransformDialog(index)"
                            >
                              Configurar SOAP/REST
                            </v-btn>
                            <v-chip
                              v-if="ruta.transformacionEntrada?.enabled"
                              size="x-small"
                              color="primary"
                              variant="outlined"
                            >
                              Entrada activa
                            </v-chip>
                            <v-chip
                              v-if="ruta.transformacionSalida?.enabled"
                              size="x-small"
                              color="success"
                              variant="outlined"
                            >
                              Salida activa
                            </v-chip>
                            <span
                              v-if="!ruta.transformacionEntrada?.enabled && !ruta.transformacionSalida?.enabled"
                              class="text-caption text-medium-emphasis"
                            >
                              Sin transformación configurada
                            </span>
                          </div>
                        </v-col>
                        <v-col cols="12" class="text-right">
                          <v-btn
                            size="small"
                            color="error"
                            variant="text"
                            @click="removeRuta(index)"
                          >
                            <v-icon size="small">mdi-delete</v-icon>
                            Eliminar Ruta
                          </v-btn>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon size="20" class="mr-2">mdi-account-group</v-icon>
                  Usuarios Asignados
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-autocomplete
                    v-model="formModel.user_ids"
                    :items="users"
                    :item-title="(item: any) => `${item.email} ${item.full_name ? '(' + item.full_name + ')' : ''}`"
                    item-value="id"
                    label="Usuarios Asignados"
                    prepend-inner-icon="mdi-account-multiple"
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
                        variant="outlined"
                      >
                        {{ item.raw.email }}
                      </v-chip>
                    </template>
                  </v-autocomplete>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
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

    <!-- Diálogo transformación SOAP/REST por ruta -->
    <v-dialog v-model="transformDialog" max-width="1100" persistent scrollable>
      <v-card v-if="transformRutaIndex !== null">
        <v-card-title class="d-flex align-center bg-secondary pa-4">
          <v-icon class="mr-2">mdi-swap-horizontal</v-icon>
          <span class="dialog-title-text text-h6">
            Transformación — Ruta {{ (transformRutaIndex ?? 0) + 1 }}
          </span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="closeTransformDialog" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <v-tabs v-model="transformTab" color="primary">
            <v-tab value="entrada">Entrada (REST → SOAP)</v-tab>
            <v-tab value="salida">Salida (SOAP → REST)</v-tab>
          </v-tabs>
          <v-tabs-window v-model="transformTab" class="mt-4">
            <v-tabs-window-item value="entrada">
              <RouteTransformEditor
                v-model="transformEntradaDraft"
                direction="request"
                :peer-request="transformSalidaDraft"
                @validation="onTransformValidation($event, 'entrada')"
              />
            </v-tabs-window-item>
            <v-tabs-window-item value="salida">
              <RouteTransformEditor
                v-model="transformSalidaDraft"
                direction="response"
                :peer-request="transformEntradaDraft"
                @validation="onTransformValidation($event, 'salida')"
              />
            </v-tabs-window-item>
          </v-tabs-window>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="closeTransformDialog">Cancelar</v-btn>
          <v-spacer />
          <v-btn color="primary" variant="elevated" @click="applyTransformDialog">
            Aplicar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo Ver Detalles -->
    <v-dialog v-model="detailsDialog" max-width="600">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center bg-info pa-4">
          <v-icon color="white" class="mr-2">mdi-application</v-icon>
          <span class="text-h6 text-white">Detalles de la Aplicación</span>
        </v-card-title>

        <v-card-text class="pt-6" v-if="applicationDetails">
          <v-list>
            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-application</v-icon>
              </template>
              <v-list-item-title>Nombre</v-list-item-title>
              <v-list-item-subtitle>{{ applicationDetails.name }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-link</v-icon>
              </template>
              <v-list-item-title>URL / Dominio</v-list-item-title>
              <v-list-item-subtitle>{{ applicationDetails.url_domain }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-domain</v-icon>
              </template>
              <v-list-item-title>Entidad</v-list-item-title>
              <v-list-item-subtitle>
                {{ getEntityName(applicationDetails.entity_id) || 'Sin entidad asignada' }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-api</v-icon>
              </template>
              <v-list-item-title>Tipo de Llamada</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip :color="getCallTypeColor(applicationDetails.call_type)" size="small" variant="tonal">
                  {{ applicationDetails.call_type }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="applicationDetails.users && applicationDetails.users.length > 0">
              <template v-slot:prepend>
                <v-icon color="primary">mdi-account-group</v-icon>
              </template>
              <v-list-item-title>Usuarios Asignados ({{ applicationDetails.users.length }})</v-list-item-title>
              <v-list-item-subtitle>
                <div class="mt-2">
                  <v-chip
                    v-for="user in applicationDetails.users"
                    :key="user.id"
                    size="small"
                    variant="outlined"
                    class="mr-1 mb-1"
                  >
                    {{ user.email }}
                  </v-chip>
                </div>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-6">
          <v-spacer></v-spacer>
          <v-btn variant="elevated" color="info" @click="detailsDialog = false">
            Cerrar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo rutas del gateway (solo lectura) -->
    <v-dialog v-model="routesDialog" max-width="960" scrollable>
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center bg-purple pa-4">
          <v-icon color="white" class="mr-2">mdi-routes</v-icon>
          <span class="text-h6 text-white">
            Rutas — {{ routesForApplication?.name || '' }}
          </span>
        </v-card-title>

        <v-card-text class="pt-4">
          <v-data-table
            :headers="routeTableHeaders"
            :items="applicationRoutes"
            :loading="loadingRoutes"
            :items-per-page="15"
            class="elevation-0"
            no-data-text="Esta aplicación no tiene rutas configuradas en el gateway"
          >
            <template v-slot:item.metodos="{ item }">
              <v-chip size="small" variant="tonal" color="primary">
                {{ item.metodos || '—' }}
              </v-chip>
            </template>
          </v-data-table>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="elevated" color="purple" @click="routesDialog = false">
            Cerrar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Usuarios Asignados -->
    <v-dialog v-model="usersDialog" max-width="800px" persistent scrollable>
      <v-card v-if="selectedApplication">
        <v-card-title class="pa-6">
          <div class="d-flex align-center justify-space-between w-100">
            <div class="d-flex align-center users-title-content">
              <v-icon color="blue" size="28" class="mr-3">mdi-account-multiple</v-icon>
              <div class="users-title-content">
                <div class="text-h5">Usuarios Asignados</div>
                <div class="text-caption text-medium-emphasis users-title-subtitle">{{ selectedApplication.name }}</div>
              </div>
            </div>
            <v-chip color="blue" class="users-title-chip" v-if="selectedApplication.users">
              {{ selectedApplication.users.length }} usuarios
            </v-chip>
          </div>
        </v-card-title>

        <v-divider></v-divider>

        <!-- Buscador y botón agregar -->
        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="12" md="8">
              <v-text-field
                v-model="userSearchQuery"
                label="Buscar usuario"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                hide-details
                clearable
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="4">
              <v-btn
                v-if="authStore.canPerform('APPLICATIONS', 'update')"
                color="blue"
                prepend-icon="mdi-account-plus"
                @click="openAddUserDialog"
                block
              >
                Agregar Usuario
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider></v-divider>

        <!-- Lista de usuarios -->
        <v-card-text style="max-height: 400px; overflow-y: auto" class="pa-0">
          <v-list v-if="selectedApplication?.users && selectedApplication.users.length > 0">
            <template v-for="(user, index) in filteredAssignedUsers" :key="user.id">
              <v-list-item>
                <template v-slot:prepend>
                  <v-avatar color="primary">
                    <v-icon>mdi-account</v-icon>
                  </v-avatar>
                </template>

                <v-list-item-title>{{ user.email }}</v-list-item-title>
                <v-list-item-subtitle v-if="user.full_name">
                  {{ user.full_name }}
                </v-list-item-subtitle>

                <template v-slot:append>
                  <v-btn
                    v-if="authStore.canPerform('APPLICATIONS', 'update')"
                    icon="mdi-close"
                    size="small"
                    variant="text"
                    color="error"
                    @click="removeUser(user.id)"
                  ></v-btn>
                </template>
              </v-list-item>
              <v-divider v-if="(index as number) < filteredAssignedUsers.length - 1"></v-divider>
            </template>
          </v-list>

          <div v-else class="pa-8 text-center text-medium-emphasis">
            <v-icon size="48" class="mb-4">mdi-account-off</v-icon>
            <div>No hay usuarios asignados a esta aplicación</div>
          </div>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-6">
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

    <!-- Dialog Agregar Usuario -->
    <v-dialog v-model="addUserDialog" max-width="500px">
      <v-card>
        <v-card-title class="pa-6">
          <span class="text-h5">Agregar Usuario</span>
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text class="pa-6">
          <v-autocomplete
            v-model="selectedUserId"
            :items="availableUsers"
            item-title="email"
            item-value="id"
            label="Seleccionar Usuario"
            variant="outlined"
            prepend-inner-icon="mdi-account"
            :loading="loadingUsers"
            no-data-text="No hay usuarios disponibles"
          >
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props">
                <template v-slot:prepend>
                  <v-avatar color="primary" size="32">
                    <v-icon size="18">mdi-account</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title>{{ item.raw.email }}</v-list-item-title>
                <v-list-item-subtitle v-if="item.raw.full_name">
                  {{ item.raw.full_name }}
                </v-list-item-subtitle>
              </v-list-item>
            </template>
          </v-autocomplete>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-6">
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="addUserDialog = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="blue"
            variant="elevated"
            @click="addUser"
            :loading="addingUser"
            :disabled="!selectedUserId"
          >
            Agregar
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
          <p>¿Está seguro que desea eliminar la aplicación <strong>{{ applicationToDelete?.name }}</strong>?</p>
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

    <v-row v-if="lastErrorDebug" class="mt-4">
      <v-col cols="12">
        <v-expansion-panels>
          <v-expansion-panel>
            <v-expansion-panel-title>
              Diagnóstico técnico del último error
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="d-flex justify-space-between align-center mb-3">
                <v-chip size="small" color="error" variant="tonal">
                  {{ lastErrorDebug.code }} ({{ lastErrorDebug.status }})
                </v-chip>
                <v-btn size="small" variant="outlined" prepend-icon="mdi-content-copy" @click="copyErrorDebug">
                  Copiar diagnóstico
                </v-btn>
              </div>
              <p class="text-body-2 mb-2"><strong>Mensaje:</strong> {{ lastErrorDebug.message }}</p>
              <p class="text-body-2 mb-2" v-if="lastErrorDebug.requestId">
                <strong>Request ID:</strong> {{ lastErrorDebug.requestId }}
              </p>
              <p class="text-body-2 mb-4">
                <strong>Endpoint:</strong> {{ lastErrorDebug.method }} {{ lastErrorDebug.url }}
              </p>
              <v-textarea
                :model-value="lastErrorDebugRaw"
                label="Detalle técnico (JSON)"
                readonly
                variant="outlined"
                rows="8"
              />
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
  import { onMounted, ref, shallowRef, toRef, computed, watch } from 'vue'
  import type { Entity, User } from "@/types"
  import api from "@/api/http"
  import type { NormalizedHttpError } from "@/api/http"
  import { useAuthStore } from "@/stores/auth.store"
  import RouteTransformEditor from '@/components/applications/RouteTransformEditor.vue'
  import {
    createEmptyTransformForm,
    hydrateRequestFromApi,
    hydrateResponseFromApi,
    serializeRequestToApi,
    serializeResponseToApi,
    validateTransformVariables,
    type RouteTransformFormModel,
  } from '@/utils/routeTransformMapper'

  const authStore = useAuthStore()
  const isReadOnly = computed(() => authStore.isApplicationsReadOnly)

  // Types
  interface ApplicationUser {
    id: number
    email: string
    full_name: string | null
    is_active: boolean
  }

  interface Application {
    id: number
    name: string
    url_domain: string
    entity_id: number | null
    call_type: string
    security_type_id: number | null
    connection_types_id: number | null
    users: ApplicationUser[]
  }

  interface SelectItem {
    id: number
    name: string
  }

  interface RutaFormModel {
    ruta_apisix: string
    ruta_destino: string
    metodos: string
    descripcion?: string
    transformacionEntrada: RouteTransformFormModel
    transformacionSalida: RouteTransformFormModel
  }

  function createRutaModel(): RutaFormModel {
    return {
      ruta_apisix: '',
      ruta_destino: '',
      metodos: 'GET',
      descripcion: '',
      transformacionEntrada: createEmptyTransformForm(),
      transformacionSalida: createEmptyTransformForm(),
    }
  }

  // Form model
  function createNewRecord() {
    return {
      id: null as number | null,
      name: '',
      url_domain: '',
      entity_id: null as number | null,
      call_type: 'GET',
      security_type_id: null as number | null,
      connection_types_id: null as number | null,
      user_ids: [] as number[],
      auth_type: 'none',
      auth_username: '',
      auth_password: '',
      auth_config: {} as Record<string, any>,
      headers_globales: {} as Record<string, string>,
      rutas: [] as RutaFormModel[]
    }
  }

  const transformDialog = shallowRef(false)
  const transformRutaIndex = ref(null as number | null)
  const transformTab = ref('entrada')
  const transformEntradaDraft = ref(createEmptyTransformForm())
  const transformSalidaDraft = ref(createEmptyTransformForm())
  const transformValidationErrors = ref([] as string[])

  function extractArray(data: any): any[] {
    if (!data?.resultObj) return []
    if (data.resultObj.items && Array.isArray(data.resultObj.items)) return data.resultObj.items
    if (Array.isArray(data.resultObj)) return data.resultObj
    return []
  }

  // State
  const applications = ref([])
  const users = ref([])
  const allUsers = ref([])
  const loadingUsers = ref(false)
  const userSearchQuery = ref('')
  const addUserDialog = ref(false)
  const addingUser = ref(false)
  const selectedUserId = ref(null)
  const entities = ref([])
  const securityTypes = ref([])
  const connectionTypes = ref([])
  const formModel = ref(createNewRecord())
  const formSectionsOpen = ref([0])
  const dialog = shallowRef(false)
  const deleteDialog = shallowRef(false)
  const detailsDialog = shallowRef(false)
  const routesDialog = shallowRef(false)
  const loadingRoutes = ref(false)
  const applicationRoutes = ref<any[]>([])
  const routesForApplication = ref<Application | null>(null)
  const usersDialog = shallowRef(false)
  const viewUsersDialog = shallowRef(false)
  const applicationToDelete = ref(null)
  const applicationDetails = ref(null)
  const selectedApplication = ref(null)
  const selectedUserIds = ref([])
  const isEditing = toRef(() => !!formModel.value.id)
  const saving = ref(false)
  const savingUsers = ref(false)
  const deleting = ref(false)
  const loading = ref(false)
  const formRef = ref(null)
  const formValid = ref(false)

  // Filtros
  const searchQuery = ref('')
  const filterEntity = ref(null)
  const filterCallType = ref(null)

  // JSON editors
  const authConfigJson = ref('')
  const headersGlobalesJson = ref('')

  // Snackbar
  const snackbar = ref({
    show: false,
    message: '',
    color: 'success'
  })
  const lastErrorDebug = ref(null as NormalizedHttpError | null)
  const lastErrorDebugRaw = computed(() => (
    lastErrorDebug.value ? JSON.stringify(lastErrorDebug.value, null, 2) : ''
  ))

  function showNotification(message: string, color: string = 'success') {
    snackbar.value = { show: true, message, color }
  }

async function copyErrorDebug() {
  if (!lastErrorDebug.value) return
  try {
    await navigator.clipboard.writeText(JSON.stringify(lastErrorDebug.value, null, 2))
    showNotification('Diagnóstico copiado al portapapeles', 'success')
  } catch {
    showNotification('No se pudo copiar el diagnóstico', 'error')
  }
}

  const callTypes = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

  // Auth types descriptions
  const authTypeDescriptions: Record<string, string> = {
    'none': 'Sin autenticación',
    'basic': 'Autenticación HTTP Basic (usuario:contraseña)',
    'bearer': 'Bearer Token (obtener token de endpoint)',
    'soap': 'SOAP Auth (credenciales en body)',
    'custom_headers': 'Headers personalizados (claves API, etc)'
  }

  function formatAuthType(type: string): string {
    const formatted: Record<string, string> = {
      'none': 'Sin autenticación',
      'basic': 'Basic Auth',
      'bearer': 'Bearer Token',
      'soap': 'SOAP Auth',
      'custom_headers': 'Headers Personalizados'
    }
    return formatted[type] || type
  }

  function getAuthTypeDescription(type: string): string {
    return authTypeDescriptions[type] || ''
  }

  // Watchers para sincronizar campos JSON
  watch(() => formModel.value.auth_config, (newVal: Record<string, any> | undefined) => {
    if (newVal && Object.keys(newVal).length > 0) {
      authConfigJson.value = JSON.stringify(newVal, null, 2)
    }
  }, { deep: true })

  watch(() => authConfigJson.value, (newVal: string) => {
    if (newVal.trim()) {
      try {
        formModel.value.auth_config = JSON.parse(newVal)
      } catch (e) {
        // Ignorar errores de JSON inválido mientras escribe
      }
    }
  })

  watch(() => formModel.value.headers_globales, (newVal: Record<string, string> | undefined) => {
    if (newVal && Object.keys(newVal).length > 0) {
      headersGlobalesJson.value = JSON.stringify(newVal, null, 2)
    }
  }, { deep: true })

  watch(() => headersGlobalesJson.value, (newVal: string) => {
    if (newVal.trim()) {
      try {
        formModel.value.headers_globales = JSON.parse(newVal)
      } catch (e) {
        // Ignorar errores de JSON inválido mientras escribe
      }
    }
  })

  // Reglas de validación
  const nameRules = [
    (v: string) => !!v || 'El nombre es requerido',
    (v: string) => v.length >= 2 || 'El nombre debe tener al menos 2 caracteres',
  ]

  const urlRules = [
    (v: string) => !!v || 'El host es requerido',
    (v: string) => {
      // Validar formato host:puerto
      const regex = /^[a-zA-Z0-9._-]+:[0-9]+$/
      return regex.test(v) || 'Formato debe ser: host:puerto (ej: proxy_argo:80, httpbin.org:80, 192.168.1.1:8080)'
    }
  ]

  const tableHeaders = computed(() => {
    const base = [
      { title: 'Aplicación', key: 'name', align: 'start' as const },
      { title: 'Entidad', key: 'entity', align: 'center' as const },
      { title: 'Tipo', key: 'call_type', align: 'center' as const },
    ]
    if (!isReadOnly.value) {
      base.push({ title: 'Usuarios', key: 'users', align: 'center' as const })
    }
    base.push({ title: 'Acciones', key: 'actions', align: 'end' as const, sortable: false })
    return base
  })

  const routeTableHeaders = [
    { title: 'Ruta gateway', key: 'ruta_apisix' },
    { title: 'Destino upstream', key: 'ruta_destino' },
    { title: 'Métodos', key: 'metodos' },
    { title: 'Descripción', key: 'descripcion' },
  ]

  // Helpers
  function getEntityName(entityId: number | null): string {
    if (!entityId) return ''
    const entity = entities.value.find((e: Entity) => e.id === entityId)
    return entity?.name || ''
  }

  // Computed
  const filteredApplications = computed(() => {
    let result = applications.value
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter((a: Application) =>
        a.name.toLowerCase().includes(query) ||
        (a.url_domain?.toLowerCase().includes(query) ?? false) ||
        a.id.toString().includes(query)
      )
    }
    if (filterEntity.value !== null) {
      result = result.filter((a: Application) => a.entity_id === filterEntity.value)
    }
    if (filterCallType.value) {
      result = result.filter((a: Application) => a.call_type === filterCallType.value)
    }
    return result
  })

  const filteredAssignedUsers = computed(() => {
  if (!selectedApplication.value?.users) return []
  if (!userSearchQuery.value) return selectedApplication.value.users
  
  const query = userSearchQuery.value.toLowerCase()
  return selectedApplication.value.users.filter((user: ApplicationUser) =>
    user.email.toLowerCase().includes(query) ||
    user.full_name?.toLowerCase().includes(query)
  )
})

const availableUsers = computed(() => {
  if (!selectedApplication.value) return allUsers.value
  
  const assignedUserIds = selectedApplication.value.users?.map((u: any) => u.id) || []
  return allUsers.value.filter((user: User) => !assignedUserIds.includes(user.id))
})

// Methods
function getCallTypeColor(callType: string) {
  const colors: any = {
    'GET': 'blue',
    'POST': 'success',
    'PUT': 'orange',
    'DELETE': 'error',
    'PATCH': 'purple'
  }
  return colors[callType] || 'grey'
}

async function loadApplications() {
  loading.value = true
  try {
    const { data } = await api.get('/applications')
    applications.value = extractArray(data)
  } catch (error: any) {
    showNotification('Error al cargar aplicaciones', 'error')
    console.error('Error loading applications:', error)
    applications.value = []
  } finally {
    loading.value = false
  }
}

async function openRoutesDialog(item: Application) {
  routesForApplication.value = item
  routesDialog.value = true
  loadingRoutes.value = true
  applicationRoutes.value = []
  try {
    const { data } = await api.get(`/applications/${item.id}/rutas`)
    applicationRoutes.value = extractArray(data)
  } catch (error: any) {
    showNotification('Error al cargar rutas de la aplicación', 'error')
    console.error('Error loading application routes:', error)
  } finally {
    loadingRoutes.value = false
  }
}

async function loadUsers() {
  loadingUsers.value = true
  try {
    const { data } = await api.get('/users')
    const list = extractArray(data)
    users.value = list
    allUsers.value = list
  } catch (error: any) {
    console.error('Error loading users:', error)
    users.value = []
    allUsers.value = []
  } finally {
    loadingUsers.value = false
  }
}

async function loadCatalogs() {
  try {
    const { data } = await api.get('/entities')
    entities.value = extractArray(data)
  } catch (error) {
    console.error('Error loading entities:', error)
    entities.value = []
  }

  try {
    const { data } = await api.get('/security-types')
    securityTypes.value = extractArray(data)
  } catch (error) {
    console.error('Error loading security types:', error)
    securityTypes.value = []
  }

  try {
    const { data } = await api.get('/connection-types')
    connectionTypes.value = extractArray(data)
  } catch (error) {
    console.error('Error loading connection types:', error)
    connectionTypes.value = []
  }
}

function openCreateDialog() {
  formModel.value = createNewRecord()
  authConfigJson.value = ''
  headersGlobalesJson.value = ''
  formSectionsOpen.value = [0]
  loadCatalogs()
  dialog.value = true
}

async function openEditDialog(application: Application) {
  try {
    await loadCatalogs()
    const { data } = await api.get(`/applications/${application.id}`)
    const found = data?.resultObj ?? data
    const rutas = Array.isArray(found.rutas)
      ? found.rutas.map((ruta: any) => ({
          ruta_apisix: ruta.ruta_apisix || '',
          ruta_destino: ruta.ruta_destino || '',
          metodos: ruta.metodos || 'GET',
          descripcion: ruta.descripcion || '',
          transformacionEntrada: hydrateRequestFromApi(ruta.transformacion_request),
          transformacionSalida: hydrateResponseFromApi(ruta.transformacion_response),
        }))
      : []

    formModel.value = {
      id: found.id,
      name: found.name,
      url_domain: found.url_domain,
      entity_id: found.entity_id,
      call_type: found.call_type,
      security_type_id: found.security_type_id,
      connection_types_id: found.connection_types_id,
      user_ids: found.users?.map((u: ApplicationUser) => u.id) || [],
      auth_type: found.auth_type || 'none',
      auth_username: found.auth_username || '',
      auth_password: found.auth_password || '',
      auth_config: found.auth_config || {},
      headers_globales: found.headers_globales || {},
      rutas
    }
    authConfigJson.value = found.auth_config && Object.keys(found.auth_config).length > 0
      ? JSON.stringify(found.auth_config, null, 2) : ''
    headersGlobalesJson.value = found.headers_globales && Object.keys(found.headers_globales).length > 0
      ? JSON.stringify(found.headers_globales, null, 2) : ''
    formSectionsOpen.value = [0]
    dialog.value = true
  } catch (error) {
    console.error('Error loading application:', error)
    showNotification('Error al cargar aplicación', 'error')
  }
}

function closeDialog() {
  dialog.value = false
  formModel.value = createNewRecord()
  formSectionsOpen.value = [0]
  detailsDialog.value = false
  applicationDetails.value = null
}

function addRuta() {
  formModel.value.rutas.push(createRutaModel())
}

function openTransformDialog(index: number) {
  const ruta = formModel.value.rutas[index]
  if (!ruta) return
  transformRutaIndex.value = index
  transformEntradaDraft.value = JSON.parse(JSON.stringify(ruta.transformacionEntrada))
  transformSalidaDraft.value = JSON.parse(JSON.stringify(ruta.transformacionSalida))
  transformValidationErrors.value = []
  const salida = ruta.transformacionSalida
  transformTab.value =
    salida?.enabled || salida?.soapXml?.trim() || (salida?.variables?.length ?? 0) > 0
      ? 'salida'
      : 'entrada'
  transformDialog.value = true
}

function closeTransformDialog() {
  transformDialog.value = false
  transformRutaIndex.value = null
}

function onTransformValidation(errors: string[], _side: string) {
  transformValidationErrors.value = [
    ...validateTransformVariables(transformEntradaDraft.value.variables),
    ...validateTransformVariables(transformSalidaDraft.value.variables),
    ...errors,
  ]
}

function applyTransformDialog() {
  const idx = transformRutaIndex.value
  if (idx === null) return
  const entradaErrors = validateTransformVariables(transformEntradaDraft.value.variables)
  const salidaErrors = validateTransformVariables(transformSalidaDraft.value.variables)
  if (entradaErrors.length || salidaErrors.length) {
    showNotification([...entradaErrors, ...salidaErrors][0], 'error')
    return
  }
  const ruta = formModel.value.rutas[idx]
  ruta.transformacionEntrada = JSON.parse(JSON.stringify(transformEntradaDraft.value))
  ruta.transformacionSalida = JSON.parse(JSON.stringify(transformSalidaDraft.value))
  // Forzar reactividad de la fila de rutas tras aplicar correcciones en el diálogo
  formModel.value.rutas.splice(idx, 1, { ...ruta })
  closeTransformDialog()
  showNotification('Transformación aplicada a la ruta', 'success')
}

function removeRuta(index: number) {
  formModel.value.rutas.splice(index, 1)
}

async function save() {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  try {
    if (authConfigJson.value?.trim()) {
      formModel.value.auth_config = JSON.parse(authConfigJson.value)
    }
    if (headersGlobalesJson.value?.trim()) {
      formModel.value.headers_globales = JSON.parse(headersGlobalesJson.value)
    }
  } catch (error) {
    showNotification('Error en formato JSON de configuración', 'error')
    return
  }

  saving.value = true
  lastErrorDebug.value = null
  try {
    const rutasPayload = formModel.value.rutas
      .map((ruta: RutaFormModel, index: number) => {
        const entradaErrors = validateTransformVariables(ruta.transformacionEntrada?.variables || [])
        const salidaErrors = validateTransformVariables(ruta.transformacionSalida?.variables || [])
        if (entradaErrors.length || salidaErrors.length) {
          throw new Error(`Variables inválidas en ruta #${index + 1}`)
        }
        return {
          ruta_apisix: (ruta.ruta_apisix || '').trim(),
          ruta_destino: (ruta.ruta_destino || '').trim(),
          metodos: (ruta.metodos || 'GET').trim(),
          descripcion: (ruta.descripcion || '').trim() || null,
          transformacion_request: serializeRequestToApi(ruta.transformacionEntrada),
          transformacion_response: serializeResponseToApi(ruta.transformacionSalida),
        }
      })
      .filter((ruta: { ruta_apisix: string; ruta_destino: string }) => ruta.ruta_apisix && ruta.ruta_destino)

    const payload = {
      name: formModel.value.name,
      url_domain: formModel.value.url_domain,
      entity_id: formModel.value.entity_id,
      call_type: formModel.value.call_type,
      security_type_id: formModel.value.security_type_id,
      connection_types_id: formModel.value.connection_types_id,
      user_ids: formModel.value.user_ids,
      auth_type: formModel.value.auth_type,
      auth_username: formModel.value.auth_username || null,
      auth_password: formModel.value.auth_password || null,
      auth_config: formModel.value.auth_config || null,
      headers_globales: formModel.value.headers_globales || null,
      rutas: rutasPayload
    }

    if (formModel.value.id) {
      await api.put(`/applications/${formModel.value.id}`, payload)
      showNotification('Aplicación actualizada exitosamente', 'success')
    } else {
      await api.post('/applications', payload)
      showNotification('Aplicación creada exitosamente', 'success')
    }
    await loadApplications()
    closeDialog()
  } catch (error: any) {
    const normalized = error?.normalized as NormalizedHttpError | undefined
    lastErrorDebug.value = normalized || null
    const message = normalized?.message || error?.message || error.response?.data?.detail || 'Error al guardar aplicación'
    showNotification(message, 'error')
  } finally {
    saving.value = false
  }
}

async function openUsersDialog(application: any) {
  selectedApplication.value = application
  userSearchQuery.value = ''
  await loadUsers()
  usersDialog.value = true
}

function openAddUserDialog() {
  selectedUserId.value = null
  addUserDialog.value = true
}

async function addUser() {
  if (!selectedUserId.value || !selectedApplication.value) return
  
  addingUser.value = true
  try {
    // Actualizar la aplicación con el nuevo usuario
    const currentUserIds = selectedApplication.value.users?.map((u: any) => u.id) || []
    const updatedUserIds = [...currentUserIds, selectedUserId.value]
    
    await api.patch(`/applications/${selectedApplication.value.id}`, {
      user_ids: updatedUserIds
    })
    
    showNotification('Usuario agregado exitosamente', 'success')
    
    // Recargar aplicaciones y actualizar la seleccionada
    await loadApplications()
    const updated = applications.value.find((a: Application) => a.id === selectedApplication.value?.id)
    if (updated) {
      selectedApplication.value = updated
    }
    
    addUserDialog.value = false
  } catch (error: any) {
    const detail = error.response?.data?.detail || 'Error al agregar usuario'
    showNotification(detail, 'error')
    console.error('Error adding user:', error)
  } finally {
    addingUser.value = false
  }
}

async function removeUser(userId: number) {
  if (!selectedApplication.value) return
  
  if (!confirm('¿Está seguro de remover este usuario de la aplicación?')) return
  
  try {
    // Actualizar la aplicación sin el usuario
    const currentUserIds = selectedApplication.value.users?.map((u: any) => u.id) || []
    const updatedUserIds = currentUserIds.filter((id: number) => id !== userId)
    
    await api.patch(`/applications/${selectedApplication.value.id}`, {
      user_ids: updatedUserIds
    })
    
    showNotification('Usuario removido exitosamente', 'success')
    
    // Recargar aplicaciones y actualizar la seleccionada
    await loadApplications()
    const updated = applications.value.find((a: Application) => a.id === selectedApplication.value?.id)
    if (updated) {
      selectedApplication.value = updated
    }
  } catch (error: any) {
    const detail = error.response?.data?.detail || 'Error al eliminar el usuario de la aplicación'
    showNotification(detail, 'error')
  }
}

function openDeleteDialog(application: Application) {
  applicationToDelete.value = application
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!applicationToDelete.value) return
  deleting.value = true
  try {
    await api.delete(`/applications/${applicationToDelete.value.id}`)
    showNotification('Aplicación eliminada exitosamente', 'success')
    await loadApplications()
    deleteDialog.value = false
    applicationToDelete.value = null
  } catch (error: any) {
    const detail = error.response?.data?.detail || 'Error al eliminar aplicación'
    showNotification(detail, 'error')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  loadApplications()
  loadCatalogs()
  if (!authStore.isApplicationsReadOnly) {
    loadUsers()
  }
})
</script>

<style scoped>
.v-data-table {
  background: transparent !important;
}

.dialog-title-text {
  min-width: 0;
  white-space: normal;
}

.users-title-content {
  min-width: 0;
}

.users-title-subtitle {
  overflow-wrap: anywhere;
}

.users-title-chip {
  flex-shrink: 0;
}
</style>
