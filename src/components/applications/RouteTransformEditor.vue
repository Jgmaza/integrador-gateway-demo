<template>
  <div class="route-transform-editor">
    <div class="d-flex align-center justify-space-between mb-3">
      <v-switch
        v-model="model.enabled"
        label="Activar transformación"
        color="primary"
        density="compact"
        hide-details
      />
      <v-chip v-if="model.enabled" size="small" color="primary" variant="tonal">
        {{ direction === 'request' ? 'REST → SOAP' : 'SOAP → REST' }}
      </v-chip>
    </div>

    <template v-if="model.enabled">
      <v-expansion-panels v-model="openPanels" variant="accordion" multiple>
        <v-expansion-panel>
          <v-expansion-panel-title>
            <v-icon size="18" class="mr-2">mdi-format-list-bulleted</v-icon>
            {{ variablesPanelTitle }}
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="d-flex justify-end mb-2">
              <v-btn size="small" variant="outlined" prepend-icon="mdi-plus" @click="addVariable">
                Agregar variable
              </v-btn>
            </div>
            <v-table v-if="model.variables.length" density="compact">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th v-if="direction === 'request'" class="text-center" style="width: 110px">Requerido</th>
                  <th class="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(variable, idx) in model.variables" :key="`${idx}-${variable.name}`">
                  <td style="min-width: 140px">
                    <v-text-field
                      v-model="variable.name"
                      density="compact"
                      variant="outlined"
                      hide-details
                      placeholder="fileBase64"
                      @update:model-value="syncVariable(idx)"
                    />
                  </td>
                  <td>
                    <v-text-field
                      v-model="variable.description"
                      density="compact"
                      variant="outlined"
                      hide-details
                      placeholder="Descripción de la variable"
                      @update:model-value="syncVariable(idx)"
                    />
                  </td>
                  <td v-if="direction === 'request'" class="text-center">
                    <v-checkbox
                      v-model="variable.required"
                      density="compact"
                      hide-details
                      color="primary"
                      @update:model-value="syncVariable(idx)"
                    />
                  </td>
                  <td class="text-end" style="width: 120px">
                    <v-btn
                      icon="mdi-code-braces"
                      size="small"
                      variant="text"
                      title="Insertar en XML"
                      @click="insertPlaceholder(variable.name)"
                    />
                    <v-btn
                      icon="mdi-delete"
                      size="small"
                      variant="text"
                      color="error"
                      @click="removeVariable(idx)"
                    />
                  </td>
                </tr>
              </tbody>
            </v-table>
            <p v-else class="text-caption text-medium-emphasis py-2">
              Sin variables. Agregue al menos una para usar en la plantilla XML.
            </p>
            <div v-if="model.variables.length" class="mt-2 d-flex flex-wrap ga-1">
              <v-chip
                v-for="v in model.variables"
                :key="v.name"
                size="small"
                variant="outlined"
                class="font-weight-medium"
                @click="insertPlaceholder(v.name)"
              >
                {{ formatPlaceholder(v.name) }}
              </v-chip>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel>
          <v-expansion-panel-title>
            <v-icon size="18" class="mr-2">mdi-xml</v-icon>
            <span>{{ xmlPanelTitle }}</span>
            <v-chip
              v-if="direction === 'response'"
              size="x-small"
              class="ml-2"
              :color="hasStoredXml ? 'success' : 'grey'"
              variant="tonal"
            >
              {{ hasStoredXml ? 'XML en BD' : 'Sin XML en BD' }}
            </v-chip>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-alert
              v-if="direction === 'response' && !hasStoredXml"
              type="info"
              variant="tonal"
              density="compact"
              class="mb-2"
            >
              No hay XML de referencia guardado para esta ruta. Puede dejarlo vacío o cargar un ejemplo.
            </v-alert>
            <div class="d-flex flex-wrap ga-2 mb-2">
              <v-btn
                v-if="direction === 'request' || !hasStoredXml"
                size="small"
                variant="tonal"
                prepend-icon="mdi-file-document-outline"
                @click="loadArgoExample"
              >
                {{ direction === 'request' ? 'Cargar ejemplo SOAP (entrada)' : 'Cargar ejemplo SOAP (salida)' }}
              </v-btn>
              <v-btn
                size="small"
                variant="outlined"
                prepend-icon="mdi-arrow-expand"
                @click="fullscreenOpen = true"
              >
                Expandir editor
              </v-btn>
            </div>
            <v-textarea
              ref="xmlTextareaRef"
              v-model="model.soapXml"
              class="xml-editor font-mono"
              variant="outlined"
              rows="14"
              auto-grow
              :placeholder="xmlPlaceholder"
            />
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel v-if="direction === 'response'">
          <v-expansion-panel-title>
            <v-icon size="18" class="mr-2">mdi-code-json</v-icon>
            JSON REST al cliente (generado)
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-textarea
              :model-value="generatedRestJson"
              variant="outlined"
              rows="6"
              readonly
              class="font-mono"
              hint="Se genera automáticamente desde las variables de salida REST"
              persistent-hint
            />
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel>
          <v-expansion-panel-title>
            <v-icon size="18" class="mr-2">mdi-eye</v-icon>
            Revisión visual
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row dense>
              <v-col cols="12">
                <v-textarea
                  v-model="previewContextJson"
                  label="Contexto de prueba (JSON)"
                  variant="outlined"
                  rows="4"
                  density="compact"
                  class="font-mono"
                  hint='Ej: {"body_json": {"fileBase64": "abc..."}} o {"body_xml": "<codigo>0</codigo>"}'
                  persistent-hint
                />
              </v-col>
              <v-col cols="12">
                <v-btn
                  color="primary"
                  variant="elevated"
                  prepend-icon="mdi-play"
                  :loading="previewLoading"
                  @click="runPreview"
                >
                  Previsualizar
                </v-btn>
              </v-col>
            </v-row>

            <v-alert
              v-for="(w, i) in previewWarnings"
              :key="i"
              type="warning"
              variant="tonal"
              density="compact"
              class="mt-3"
            >
              {{ w }}
            </v-alert>

            <v-row v-if="previewResult" class="mt-2">
              <v-col cols="12" md="6">
                <div class="text-subtitle-2 mb-1">{{ previewRenderedLabel }}</div>
                <v-textarea
                  :model-value="previewRenderedContent"
                  variant="outlined"
                  rows="10"
                  readonly
                  class="font-mono preview-output"
                />
              </v-col>
              <v-col cols="12" md="6" v-if="direction === 'response' && previewRestJson">
                <div class="text-subtitle-2 mb-1">JSON REST al cliente (renderizado)</div>
                <v-textarea
                  :model-value="previewRestJson"
                  variant="outlined"
                  rows="10"
                  readonly
                  class="font-mono preview-output"
                />
              </v-col>
              <v-col cols="12" v-if="previewVariables.length">
                <div class="text-subtitle-2 mb-1">Variables resueltas</div>
                <v-table density="compact">
                  <tbody>
                    <tr v-for="row in previewVariables" :key="row.name">
                      <td class="font-weight-medium">{{ row.name }}</td>
                      <td class="text-truncate" style="max-width: 280px">{{ row.value }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-col>
            </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>

    <v-dialog v-model="fullscreenOpen" fullscreen scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <span>{{ xmlPanelTitle }}</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="fullscreenOpen = false" />
        </v-card-title>
        <v-divider />
        <v-card-text>
          <div class="d-flex flex-wrap ga-2 mb-2">
            <v-chip
              v-for="v in model.variables"
              :key="'fs-' + v.name"
              size="small"
              @click="insertPlaceholder(v.name)"
            >
              {{ formatPlaceholder(v.name) }}
            </v-chip>
          </div>
          <v-textarea
            v-model="model.soapXml"
            class="xml-editor font-mono"
            variant="outlined"
            rows="24"
            auto-grow
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import api from '@/api/http'
import {
  type RouteTransformFormModel,
  type TransformVariableItem,
  analyzePlaceholders,
  validateTransformVariables,
  serializeRequestToApi,
  serializeResponseToApi,
  ARGO_REQUEST_EXAMPLE,
  ARGO_RESPONSE_EXAMPLE,
} from '@/utils/routeTransformMapper'

const props = defineProps<{
  modelValue: RouteTransformFormModel
  direction: 'request' | 'response'
  /** Formulario de salida (solo para preview response → REST) */
  peerRequest?: RouteTransformFormModel | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: RouteTransformFormModel]
  validation: [errors: string[]]
}>()

const model = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const openPanels = ref<number[]>([0, 1])

const hasStoredXml = computed(() => !!model.value.soapXml?.trim())

function syncOpenPanels() {
  if (props.direction === 'response') {
    openPanels.value = [0, 1, 2]
    return
  }
  openPanels.value = [0, 1]
}
const xmlTextareaRef = ref<{ $el?: HTMLElement } | null>(null)
const fullscreenOpen = ref(false)
const previewContextJson = ref('{\n  "body_json": {}\n}')
const previewLoading = ref(false)
const previewResult = ref<Record<string, unknown> | null>(null)
const localWarnings = ref<string[]>([])

const variablesPanelTitle = computed(() =>
  props.direction === 'request'
    ? 'Variables de entrada (REST → SOAP)'
    : 'Variables de salida REST (cliente)'
)

const xmlPanelTitle = computed(() =>
  props.direction === 'request'
    ? 'XML SOAP de entrada'
    : 'XML SOAP de respuesta (referencia mock)'
)

const xmlPlaceholder = computed(() =>
  props.direction === 'request'
    ? 'Pegue el envelope SOAP con {{variables}}...'
    : 'Ejemplo de XML de respuesta; {{variables}} coinciden con la extracción configurada'
)

const generatedRestJson = computed(() => {
  if (props.direction !== 'response') return ''
  const payload: Record<string, string> = {}
  for (const v of model.value.variables) {
    const name = v.name.trim()
    if (name) payload[name] = `{{${name}}}`
  }
  return JSON.stringify(payload, null, 2)
})

const previewWarnings = computed(() => [
  ...localWarnings.value,
  ...((previewResult.value?.warnings as string[]) || []),
])

const previewRenderedContent = computed(() => {
  if (!previewResult.value) return ''
  if (props.direction === 'request') {
    return String(previewResult.value.request_rendered ?? '')
  }
  return String(previewResult.value.response_rendered ?? '')
})

const previewRestJson = computed(() =>
  previewResult.value?.rest_client_rendered
    ? String(previewResult.value.rest_client_rendered)
    : ''
)

const previewRenderedLabel = computed(() =>
  props.direction === 'request' ? 'XML SOAP renderizado' : 'XML SOAP respuesta renderizado'
)

const previewVariables = computed(() => {
  const resolved = previewResult.value?.resolved_variables as Record<string, unknown> | undefined
  if (!resolved) return []
  return Object.entries(resolved).map(([name, value]) => ({
    name,
    value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
  }))
})

function formatPlaceholder(name: string) {
  const n = (name || '').trim()
  return n ? `{{${n}}}` : '{{}}'
}

function addVariable() {
  model.value = {
    ...model.value,
    variables: [...model.value.variables, { name: '', description: '', required: false }],
  }
}

function syncVariable(index: number) {
  const vars = [...model.value.variables]
  vars[index] = { ...vars[index] }
  model.value = { ...model.value, variables: vars }
}

function mergeVariablesFromExample(
  current: TransformVariableItem[],
  example: TransformVariableItem[]
): TransformVariableItem[] {
  const byName = new Map(
    current
      .filter((v) => v.name.trim())
      .map((v) => [v.name.trim(), v])
  )
  return example.map((sample) => {
    const name = sample.name.trim()
    const existing = byName.get(name)
    if (!existing) return { ...sample, required: !!sample.required }
    return {
      ...sample,
      description: existing.description || sample.description,
      required: existing.required,
      source: existing.source ?? sample.source,
      source_path: existing.source_path ?? sample.source_path,
      default_value: existing.default_value ?? sample.default_value,
    }
  })
}

function removeVariable(index: number) {
  const vars = [...model.value.variables]
  vars.splice(index, 1)
  model.value = { ...model.value, variables: vars }
}

function insertPlaceholder(name: string) {
  const token = formatPlaceholder(name)
  if (!token || token === '{{}}') return
  model.value = {
    ...model.value,
    soapXml: `${model.value.soapXml}${model.value.soapXml ? '\n' : ''}${token}`,
  }
}

function loadArgoExample() {
  const example = props.direction === 'request' ? ARGO_REQUEST_EXAMPLE : ARGO_RESPONSE_EXAMPLE
  model.value = {
    ...example,
    variables: mergeVariablesFromExample(model.value.variables, example.variables),
    soapXml: example.soapXml,
  }
  openPanels.value = [0, 1, 2, 3]
}

function runValidation(): string[] {
  const errors = validateTransformVariables(model.value.variables)
  localWarnings.value = []
  if (model.value.enabled && model.value.soapXml.trim()) {
    const analysis = analyzePlaceholders(
      model.value.soapXml,
      model.value.variables,
      props.direction === 'request' ? 'Entrada' : 'Salida'
    )
    localWarnings.value = analysis.warnings
  }
  emit('validation', errors)
  return errors
}

async function runPreview() {
  runValidation()
  let context: Record<string, unknown> = {}
  try {
    if (previewContextJson.value.trim()) {
      context = JSON.parse(previewContextJson.value)
    }
  } catch {
    localWarnings.value = ['Contexto de prueba: JSON inválido']
    return
  }

  const payload: Record<string, unknown> = {
    context,
  }
  if (props.direction === 'request') {
    payload.transformacion_request = serializeRequestToApi(model.value)
    if (props.peerRequest) {
      payload.transformacion_response = serializeResponseToApi(props.peerRequest)
    }
  } else {
    payload.transformacion_response = serializeResponseToApi(model.value)
    if (props.peerRequest) {
      payload.transformacion_request = serializeRequestToApi(props.peerRequest)
    }
  }

  previewLoading.value = true
  previewResult.value = null
  try {
    const { data } = await api.post('/applications/transform/preview', payload)
    previewResult.value = (data?.resultObj ?? data) as Record<string, unknown>
    openPanels.value = [...new Set([...openPanels.value, 3])]
  } catch (e: unknown) {
    const err = e as { normalized?: { message?: string }; message?: string }
    localWarnings.value = [err?.normalized?.message || err?.message || 'Error al previsualizar']
  } finally {
    previewLoading.value = false
  }
}

watch(
  () => [props.direction, model.value.soapXml],
  () => syncOpenPanels(),
  { immediate: true }
)

watch(
  () => [model.value.variables, model.value.soapXml, model.value.enabled],
  () => runValidation(),
  { deep: true }
)

defineExpose({ runValidation, serializeRequestToApi, serializeResponseToApi })
</script>

<style scoped>
.xml-editor :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.45;
}
.preview-output :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
