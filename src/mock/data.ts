/** Fictional seed — no institutional hosts or brands. */

export const DEMO_USER = {
  id: 1,
  email: "demo@interop.local",
  full_name: "Demo Admin",
  is_active: true,
  is_superuser: true,
  role_id: 1,
  entity_id: 1,
  applications: [] as unknown[],
};

export const DEMO_ROLE = { id: 1, name: "admin" };

export const ENTITIES = [
  { id: 1, name: "Document office (demo)" },
  { id: 2, name: "Civil registry (demo)" },
  { id: 3, name: "Trade ops (demo)" },
];

export const SECURITY_TYPES = [
  { id: 1, name: "SOAP Basic" },
  { id: 2, name: "Bearer" },
  { id: 3, name: "Security-server hop" },
];

export const CONNECTION_TYPES = [
  { id: 1, name: "Direct" },
  { id: 2, name: "VPN tunnel (demo)" },
];

export const USERS = [
  DEMO_USER,
  {
    id: 2,
    email: "ops@interop.local",
    full_name: "Demo Operator",
    is_active: true,
    is_superuser: false,
    role_id: 2,
    entity_id: 1,
  },
];

const docketSoap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:doc="urn:docketos:filing">
  <soapenv:Body>
    <doc:radicarBorrador>
      <doc:asunto>{{subject}}</doc:asunto>
      <doc:dependencia>{{dependency}}</doc:dependencia>
      <doc:valor>{{amount}}</doc:valor>
    </doc:radicarBorrador>
  </soapenv:Body>
</soapenv:Envelope>`;

function wrapList<T>(items: T[]) {
  return {
    resultCode: "OK",
    message: "ok",
    errorDescription: null,
    resultObj: { items, total: items.length },
    systemTime: Date.now(),
  };
}

function wrapOne<T>(obj: T) {
  return {
    resultCode: "OK",
    message: "ok",
    errorDescription: null,
    resultObj: obj,
    systemTime: Date.now(),
  };
}

export const APPLICATIONS = [
  {
    id: 1,
    name: "DocketOS",
    url_domain: "docketos.demo.internal",
    entity_id: 1,
    call_type: "SOAP",
    security_type_id: 1,
    connection_types_id: 1,
    users: [
      {
        id: 1,
        email: DEMO_USER.email,
        full_name: DEMO_USER.full_name,
        is_active: true,
      },
    ],
    auth_type: "soap",
    auth_config: {},
    headers_globales: {},
    rutas: [
      {
        ruta_apisix: "/gateway/docket/file-draft",
        ruta_destino: "/soap/radicarBorrador",
        metodos: "POST",
        descripcion: "JSON draft → SOAP filing",
        transformacion_request: {
          enabled: true,
          engine: "mustache",
          template: docketSoap,
          content_type: "text/xml",
          variable_sources: {
            subject: {
              source: "body_json",
              source_path: "$.subject",
              required: true,
              description: "Filing subject",
            },
            dependency: {
              source: "body_json",
              source_path: "$.dependency",
              required: true,
              description: "Owning office",
            },
            amount: {
              source: "body_json",
              source_path: "$.amount",
              required: false,
              description: "Amount",
            },
          },
          mapping: {},
          metadata: { ui_version: 2 },
        },
        transformacion_response: {
          enabled: true,
          engine: "mustache",
          template: "<ticket>{{ticket}}</ticket>",
          variable_sources: {
            ticket: {
              source: "xml",
              source_path: "//ticket",
              required: true,
              description: "Ticket id",
            },
          },
          mapping: {},
          metadata: { ui_version: 2 },
        },
      },
      {
        ruta_apisix: "/gateway/docket/status",
        ruta_destino: "/soap/consultar",
        metodos: "GET",
        descripcion: "Status query via SOAP",
        transformacion_request: {
          enabled: true,
          engine: "mustache",
          template:
            "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\"><soapenv:Body><consultar><ticket>{{ticket}}</ticket></consultar></soapenv:Body></soapenv:Envelope>",
          content_type: "text/xml",
          variable_sources: {
            ticket: {
              source: "query",
              source_path: "ticket",
              required: true,
              description: "Ticket id",
            },
          },
          mapping: {},
          metadata: { ui_version: 2 },
        },
        transformacion_response: null,
      },
    ],
  },
  {
    id: 2,
    name: "CivicHub",
    url_domain: "civichub.demo.internal",
    entity_id: 2,
    call_type: "REST",
    security_type_id: 3,
    connection_types_id: 2,
    users: [],
    auth_type: "xroad",
    auth_config: {},
    headers_globales: {},
    rutas: [
      {
        ruta_apisix: "/gateway/civic/person-lookup",
        ruta_destino: "/ss/PersonLookup",
        metodos: "POST",
        descripcion: "Person lookup via security-server hop",
        transformacion_request: {
          enabled: true,
          engine: "mustache",
          template:
            '{\n  "service": "PersonLookup",\n  "payload": {\n    "documentType": "{{documentType}}",\n    "documentNumber": "{{documentNumber}}"\n  }\n}',
          content_type: "application/json",
          variable_sources: {
            documentType: {
              source: "body_json",
              source_path: "$.documentType",
              required: true,
              description: "ID type",
            },
            documentNumber: {
              source: "body_json",
              source_path: "$.documentNumber",
              required: true,
              description: "ID number",
            },
          },
          mapping: {},
          metadata: { ui_version: 2 },
        },
        transformacion_response: null,
      },
      {
        ruta_apisix: "/gateway/civic/token",
        ruta_destino: "/ss/token",
        metodos: "POST",
        descripcion: "Token broker (empty client body)",
        transformacion_request: {
          enabled: false,
          engine: "mustache",
          template: null,
          variable_sources: {},
          mapping: {},
          metadata: { ui_version: 2 },
        },
        transformacion_response: null,
      },
    ],
  },
  {
    id: 3,
    name: "TradeDesk",
    url_domain: "tradedesk.demo.internal",
    entity_id: 3,
    call_type: "REST",
    security_type_id: 2,
    connection_types_id: 1,
    users: [],
    auth_type: "service_login",
    auth_config: {},
    headers_globales: {},
    rutas: [
      {
        ruta_apisix: "/gateway/trade/catalog",
        ruta_destino: "/api/catalog",
        metodos: "GET",
        descripcion: "REST passthrough after JWT gate",
        transformacion_request: null,
        transformacion_response: null,
      },
    ],
  },
];

export { wrapList, wrapOne };
