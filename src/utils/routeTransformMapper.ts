/** Modelo UI y mapeo hacia transformacion_request / transformacion_response (API). */

export interface TransformVariableItem {
  name: string
  description: string
  source?: string
  source_path?: string
  required?: boolean
  default_value?: unknown
  parse_mode?: string
  pipe_index?: number
  pipe_join_rest?: boolean
}

export interface RouteTransformFormModel {
  enabled: boolean
  variables: TransformVariableItem[]
  soapXml: string
}

export interface PlaceholderAnalysis {
  orphan: string[]
  unused: string[]
  warnings: string[]
}

const VARIABLE_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/
const PLACEHOLDER_REGEX = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g

export function createEmptyTransformForm(): RouteTransformFormModel {
  return {
    enabled: false,
    variables: [],
    soapXml: '',
  }
}

export function extractPlaceholders(template: string): string[] {
  if (!template) return []
  const found: string[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(PLACEHOLDER_REGEX.source, 'g')
  while ((match = re.exec(template)) !== null) {
    if (!found.includes(match[1])) found.push(match[1])
  }
  return found
}

export function analyzePlaceholders(
  template: string,
  variables: TransformVariableItem[],
  label: string
): PlaceholderAnalysis {
  const defined = variables.map((v) => v.name.trim()).filter(Boolean)
  const used = extractPlaceholders(template)
  const definedSet = new Set(defined)
  const usedSet = new Set(used)
  const orphan = used.filter((n) => !definedSet.has(n))
  const unused = defined.filter((n) => !usedSet.has(n))
  const warnings: string[] = []
  if (orphan.length) {
    warnings.push(`${label}: placeholders sin definir: ${orphan.join(', ')}`)
  }
  if (unused.length) {
    warnings.push(`${label}: variables no usadas en plantilla: ${unused.join(', ')}`)
  }
  return { orphan, unused, warnings }
}

export function validateTransformVariables(variables: TransformVariableItem[]): string[] {
  const errors: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < variables.length; i++) {
    const name = (variables[i].name || '').trim()
    if (!name) {
      errors.push(`Fila ${i + 1}: el nombre de variable es obligatorio`)
      continue
    }
    if (!VARIABLE_NAME_REGEX.test(name)) {
      errors.push(`"${name}": use solo letras, números y _ (debe empezar con letra)`)
    }
    if (seen.has(name)) {
      errors.push(`"${name}": nombre duplicado`)
    }
    seen.add(name)
  }
  return errors
}

function buildVariableSources(
  variables: TransformVariableItem[],
  defaultSource = 'body_json'
): Record<string, unknown> {
  const sources: Record<string, unknown> = {}
  for (const v of variables) {
    const name = v.name.trim()
    if (!name) continue
    const source = v.source || defaultSource
    let sourcePath = v.source_path
    if (!sourcePath && source === 'body_json') {
      sourcePath = `$.${name}`
    }
    const entry: Record<string, unknown> = {
      source,
      source_path: sourcePath,
      required: !!v.required,
      default_value: v.default_value,
      description: v.description || '',
    }
    if (v.parse_mode) entry.parse_mode = v.parse_mode
    if (v.pipe_index !== undefined) entry.pipe_index = v.pipe_index
    if (v.pipe_join_rest) entry.pipe_join_rest = v.pipe_join_rest
    sources[name] = entry
  }
  return sources
}

function buildRestTemplate(variables: TransformVariableItem[]): string {
  const payload: Record<string, string> = {}
  for (const v of variables) {
    const name = v.name.trim()
    if (name) payload[name] = `{{${name}}}`
  }
  return JSON.stringify(payload, null, 2)
}

export function variableSourcesToList(
  variableSources?: Record<string, unknown> | null
): TransformVariableItem[] {
  if (!variableSources || typeof variableSources !== 'object') return []
  return Object.entries(variableSources).map(([name, def]) => {
    const d = (def && typeof def === 'object' ? def : {}) as Record<string, unknown>
    return {
      name,
      description: String(d.description ?? ''),
      source: d.source as string | undefined,
      source_path: d.source_path as string | undefined,
      required: !!d.required,
      default_value: d.default_value,
      parse_mode: d.parse_mode as string | undefined,
      pipe_index: typeof d.pipe_index === 'number' ? d.pipe_index : undefined,
      pipe_join_rest: !!d.pipe_join_rest,
    }
  })
}

export function hydrateRequestFromApi(raw: Record<string, unknown> | null | undefined): RouteTransformFormModel {
  if (!raw) return createEmptyTransformForm()
  return {
    enabled: !!raw.enabled,
    variables: variableSourcesToList(raw.variable_sources as Record<string, unknown>),
    soapXml: String(raw.template ?? ''),
  }
}

export function hydrateResponseFromApi(raw: Record<string, unknown> | null | undefined): RouteTransformFormModel {
  if (!raw) return createEmptyTransformForm()
  const mapping = (raw.mapping && typeof raw.mapping === 'object' ? raw.mapping : {}) as Record<string, unknown>
  let variables = variableSourcesToList(raw.variable_sources as Record<string, unknown>)
  if (!variables.length && Array.isArray(mapping.rest_fields)) {
    variables = (mapping.rest_fields as TransformVariableItem[]).map((f) => ({
      name: String(f.name ?? ''),
      description: String(f.description ?? ''),
      source: f.source,
      source_path: f.source_path,
      parse_mode: f.parse_mode,
      pipe_index: f.pipe_index,
      pipe_join_rest: f.pipe_join_rest,
    }))
  } else if (Array.isArray(mapping.rest_fields)) {
    const byName = new Map(
      (mapping.rest_fields as TransformVariableItem[]).map((f) => [
        String(f.name ?? '').trim(),
        f,
      ])
    )
    variables = variables.map((v) => {
      const extra = byName.get(v.name.trim())
      if (!extra) return v
      return {
        ...v,
        source_path: v.source_path ?? extra.source_path,
        parse_mode: v.parse_mode ?? extra.parse_mode,
        pipe_index: v.pipe_index ?? extra.pipe_index,
        pipe_join_rest: v.pipe_join_rest ?? extra.pipe_join_rest,
      }
    })
  }
  return {
    enabled: !!raw.enabled,
    variables,
    soapXml: String(raw.template ?? ''),
  }
}

export function serializeRequestToApi(form: RouteTransformFormModel): Record<string, unknown> | null {
  if (!form.enabled && !form.soapXml.trim() && !form.variables.length) {
    return null
  }
  return {
    enabled: form.enabled,
    engine: 'mustache',
    template: form.soapXml || null,
    content_type: 'text/xml',
    variable_sources: buildVariableSources(form.variables, 'body_json'),
    mapping: {},
    metadata: { ui_version: 2 },
  }
}

export function serializeResponseToApi(form: RouteTransformFormModel): Record<string, unknown> | null {
  if (!form.enabled && !form.soapXml.trim() && !form.variables.length) {
    return null
  }
  const restTemplate = buildRestTemplate(form.variables)
  return {
    enabled: form.enabled,
    engine: 'mustache',
    template: form.soapXml || null,
    content_type: 'text/xml',
    variable_sources: buildVariableSources(form.variables, 'body_xml'),
    mapping: {
      rest_fields: form.variables.map((v) => {
        const field: Record<string, unknown> = {
          name: v.name.trim(),
          description: v.description || '',
        }
        if (v.source_path) field.source_path = v.source_path
        if (v.parse_mode) field.parse_mode = v.parse_mode
        if (v.pipe_index !== undefined) field.pipe_index = v.pipe_index
        if (v.pipe_join_rest) field.pipe_join_rest = v.pipe_join_rest
        return field
      }),
      rest_template: restTemplate,
    },
    metadata: { ui_version: 2 },
  }
}

/** Plantilla ejemplo ARGO (radicar documento). */
export const ARGO_REQUEST_EXAMPLE: RouteTransformFormModel = {
  enabled: true,
  variables: [
    { name: 'fileBase64', description: 'Archivo de la petición en base64' },
    { name: 'dest_cc_documento', description: 'Documento del destinatario' },
    { name: 'dest_nombre', description: 'Nombre del destinatario' },
    { name: 'dest_mail', description: 'Correo del destinatario' },
    { name: 'asu', description: 'Asunto del radicado' },
  ],
  soapXml: `<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:nusoap">
   <soapenv:Header/>
   <soapenv:Body>
      <urn:radicarDocumento soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
         <file xsi:type="xsd:base64Binary">{{fileBase64}}</file>
         <fileName xsi:type="xsd:string">prueba.pdf</fileName>
         <dest_tipo_documento xsi:type="xsd:integer">0</dest_tipo_documento>
         <dest_cc_documento xsi:type="xsd:string">{{dest_cc_documento}}</dest_cc_documento>
         <dest_nombre xsi:type="xsd:string">{{dest_nombre}}</dest_nombre>
         <dest_telefono xsi:type="xsd:string">?</dest_telefono>
         <dest_direccion xsi:type="xsd:string">?</dest_direccion>
         <dest_mail xsi:type="xsd:string">{{dest_mail}}</dest_mail>
         <dest_dignatario xsi:type="xsd:string">?</dest_dignatario>
         <dest_cargo xsi:type="xsd:string">?</dest_cargo>
         <dest_genero xsi:type="xsd:string">0</dest_genero>
         <dest_idcont xsi:type="xsd:integer">1</dest_idcont>
         <dest_idpais xsi:type="xsd:integer">170</dest_idpais>
         <dest_codep xsi:type="xsd:integer">11</dest_codep>
         <dest_muni xsi:type="xsd:integer">1</dest_muni>
         <tip_rem xsi:type="xsd:integer">0</tip_rem>
         <tipo_persona xsi:type="xsd:integer">0</tipo_persona>
         <asu xsi:type="xsd:string">{{asu}}</asu>
         <med xsi:type="xsd:integer">4</med>
         <ane xsi:type="xsd:string">Documento Anexo</ane>
         <tpRadicado xsi:type="xsd:integer">1</tpRadicado>
         <coddepe xsi:type="xsd:integer">4500</coddepe>
         <usuaDocActu xsi:type="xsd:integer">1144132836</usuaDocActu>
         <formulario xsi:type="xsd:string">?</formulario>
         <camposAdicionales xsi:type="xsd:string">?</camposAdicionales>
      </urn:radicarDocumento>
   </soapenv:Body>
</soapenv:Envelope>`,
}

export const ARGO_RESPONSE_EXAMPLE: RouteTransformFormModel = {
  enabled: true,
  variables: [
    { name: 'radicado', description: 'Número de radicado retornado por el servicio' },
  ],
  soapXml: `<SOAP-ENV:Envelope SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/">
   <SOAP-ENV:Body>
      <ns1:radicarDocuments xmlns:ns1="urn:nusoap">
         <return xsi:type="SOAP-ENC:Array" SOAP-ENC:arrayType=":[1]">
            <item xsi:type="xsd:">
               <status xsi:type="xsd:string">0</status>
               <result xsi:type="xsd:string">{{radicado}}</result>
            </item>
         </return>
      </ns1:radicarDocuments>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`,
}
