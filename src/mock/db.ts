export type Role = "admin" | "operator" | "consumer";

export type AuthType =
  | "soap"
  | "bearer"
  | "xroad"
  | "service_login"
  | "none";

export type TransformKind =
  | "rest_to_soap"
  | "rest_passthrough"
  | "rest_to_security_server"
  | "token_broker";

export type TransformVariable = {
  name: string;
  description: string;
  required: boolean;
};

export type RouteTransform = {
  enabled: boolean;
  direction: "request" | "response";
  kind: TransformKind;
  variables: TransformVariable[];
  template: string;
  notes: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  password: string;
  appIds: string[];
};

export type GatewayApp = {
  id: string;
  name: string;
  code: string;
  description: string;
  authType: AuthType;
  callType: string;
  entityLabel: string;
  upstreamProtocol: string;
  urlDomain: string;
  status: "synced" | "drift";
  routeCount: number;
  userCount: number;
};

export type GatewayRoute = {
  id: string;
  appId: string;
  path: string;
  method: "GET" | "POST" | "PUT";
  transform: TransformKind;
  summary: string;
  hidesUpstreamCreds: boolean;
  apisixPath: string;
  status: "active" | "draft";
  transformSpec: RouteTransform;
};

export const DEMO_USERS: User[] = [
  {
    id: "u-admin",
    email: "admin@interop-demo.dev",
    name: "Ada Admin",
    role: "admin",
    password: "demo1234",
    appIds: ["app-docket", "app-civic", "app-trade", "app-firm"],
  },
  {
    id: "u-ops",
    email: "ops@interop-demo.dev",
    name: "Omar Operator",
    role: "operator",
    password: "demo1234",
    appIds: ["app-docket", "app-civic"],
  },
  {
    id: "u-consumer",
    email: "consumer@interop-demo.dev",
    name: "Carla Consumer",
    role: "consumer",
    password: "demo1234",
    appIds: ["app-docket"],
  },
];

export const APPS: GatewayApp[] = [
  {
    id: "app-docket",
    name: "DocketOS",
    code: "DOCKET",
    description:
      "Legacy document workflow exposed only as SOAP. Consumers speak JSON REST; the gateway translates envelopes and hides service credentials.",
    authType: "soap",
    callType: "SOAP",
    entityLabel: "Document office",
    upstreamProtocol: "SOAP 1.1 / XML",
    urlDomain: "docketos.demo.internal",
    status: "synced",
    routeCount: 4,
    userCount: 3,
  },
  {
    id: "app-civic",
    name: "CivicHub",
    code: "CIVIC",
    description:
      "Civil registry queries behind a security-server style hop. Gateway brokers the token and normalizes the payload.",
    authType: "xroad",
    callType: "REST",
    entityLabel: "Civil registry",
    upstreamProtocol: "Security server / REST",
    urlDomain: "civichub.demo.internal",
    status: "synced",
    routeCount: 3,
    userCount: 2,
  },
  {
    id: "app-trade",
    name: "TradeDesk",
    code: "TRADE",
    description:
      "External trade catalog with service-account login. Gateway performs token broker and never returns upstream secrets to clients.",
    authType: "service_login",
    callType: "REST",
    entityLabel: "Trade ops",
    upstreamProtocol: "REST + service login",
    urlDomain: "tradedesk.demo.internal",
    status: "synced",
    routeCount: 3,
    userCount: 1,
  },
  {
    id: "app-firm",
    name: "FirmBook",
    code: "FIRM",
    description:
      "Company directory REST API. Mostly passthrough with JWT-gated access and assigned-app RBAC.",
    authType: "bearer",
    callType: "REST",
    entityLabel: "Company registry",
    upstreamProtocol: "REST",
    urlDomain: "firmbook.demo.internal",
    status: "drift",
    routeCount: 2,
    userCount: 1,
  },
];

const docketSoapTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:doc="urn:docketos:filing">
  <soapenv:Header/>
  <soapenv:Body>
    <doc:radicarBorrador>
      <doc:asunto>{{subject}}</doc:asunto>
      <doc:dependencia>{{dependency}}</doc:dependencia>
      <doc:valor>{{amount}}</doc:valor>
      <!-- upstream credentials injected by gateway -->
    </doc:radicarBorrador>
  </soapenv:Body>
</soapenv:Envelope>`;

export const ROUTES: GatewayRoute[] = [
  {
    id: "r-docket-file",
    appId: "app-docket",
    path: "/docket/file-draft",
    method: "POST",
    transform: "rest_to_soap",
    summary: "JSON draft → SOAP radicarBorrador → JSON ticket",
    hidesUpstreamCreds: true,
    apisixPath: "/gateway/docket/file-draft",
    status: "active",
    transformSpec: {
      enabled: true,
      direction: "request",
      kind: "rest_to_soap",
      variables: [
        { name: "subject", description: "Filing subject", required: true },
        { name: "dependency", description: "Owning office", required: true },
        { name: "amount", description: "Numeric amount (XSD integer)", required: false },
      ],
      template: docketSoapTemplate,
      notes: "REST body fields map into SOAP placeholders. Client never sends SOAP credentials.",
    },
  },
  {
    id: "r-docket-attach",
    appId: "app-docket",
    path: "/docket/attach",
    method: "POST",
    transform: "rest_to_soap",
    summary: "Attach file metadata via SOAP anexar",
    hidesUpstreamCreds: true,
    apisixPath: "/gateway/docket/attach",
    status: "active",
    transformSpec: {
      enabled: true,
      direction: "request",
      kind: "rest_to_soap",
      variables: [
        { name: "ticket", description: "Filing ticket id", required: true },
        { name: "fileName", description: "Attachment name", required: true },
        { name: "fileBase64", description: "File bytes as base64", required: true },
      ],
      template: `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:doc="urn:docketos:filing">
  <soapenv:Body>
    <doc:anexar>
      <doc:ticket>{{ticket}}</doc:ticket>
      <doc:nombre>{{fileName}}</doc:nombre>
      <doc:contenido>{{fileBase64}}</doc:contenido>
    </doc:anexar>
  </soapenv:Body>
</soapenv:Envelope>`,
      notes: "Binary payload stays in JSON; gateway embeds it in the SOAP body.",
    },
  },
  {
    id: "r-docket-status",
    appId: "app-docket",
    path: "/docket/status",
    method: "GET",
    transform: "rest_to_soap",
    summary: "Query filing status with SOAP consultar",
    hidesUpstreamCreds: true,
    apisixPath: "/gateway/docket/status",
    status: "active",
    transformSpec: {
      enabled: true,
      direction: "request",
      kind: "rest_to_soap",
      variables: [
        { name: "ticket", description: "Filing ticket id", required: true },
      ],
      template: `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:doc="urn:docketos:filing">
  <soapenv:Body>
    <doc:consultar>
      <doc:ticket>{{ticket}}</doc:ticket>
    </doc:consultar>
  </soapenv:Body>
</soapenv:Envelope>`,
      notes: "Query params become SOAP body fields; response XML is normalized to JSON.",
    },
  },
  {
    id: "r-docket-stage",
    appId: "app-docket",
    path: "/docket/change-stage",
    method: "POST",
    transform: "rest_to_soap",
    summary: "Advance workflow stage through SOAP",
    hidesUpstreamCreds: true,
    apisixPath: "/gateway/docket/change-stage",
    status: "draft",
    transformSpec: {
      enabled: true,
      direction: "request",
      kind: "rest_to_soap",
      variables: [
        { name: "ticket", description: "Filing ticket id", required: true },
        { name: "stage", description: "Target stage code", required: true },
      ],
      template: `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:doc="urn:docketos:filing">
  <soapenv:Body>
    <doc:cambiarEtapa>
      <doc:ticket>{{ticket}}</doc:ticket>
      <doc:etapa>{{stage}}</doc:etapa>
    </doc:cambiarEtapa>
  </soapenv:Body>
</soapenv:Envelope>`,
      notes: "Draft route — catalog entry ready, gateway reconcile pending.",
    },
  },
  {
    id: "r-civic-token",
    appId: "app-civic",
    path: "/civic/token",
    method: "POST",
    transform: "token_broker",
    summary: "Broker security-server token (empty body from client)",
    hidesUpstreamCreds: true,
    apisixPath: "/gateway/civic/token",
    status: "active",
    transformSpec: {
      enabled: true,
      direction: "request",
      kind: "token_broker",
      variables: [],
      template: "",
      notes: "Client sends empty body. Gateway loads vaulted credentials and returns a short-lived token.",
    },
  },
  {
    id: "r-civic-lookup",
    appId: "app-civic",
    path: "/civic/person-lookup",
    method: "POST",
    transform: "rest_to_security_server",
    summary: "Person lookup via security-server hop",
    hidesUpstreamCreds: true,
    apisixPath: "/gateway/civic/person-lookup",
    status: "active",
    transformSpec: {
      enabled: true,
      direction: "request",
      kind: "rest_to_security_server",
      variables: [
        { name: "documentType", description: "ID type code", required: true },
        { name: "documentNumber", description: "ID number", required: true },
      ],
      template: `{
  "service": "PersonLookup",
  "payload": {
    "documentType": "{{documentType}}",
    "documentNumber": "{{documentNumber}}"
  }
}`,
      notes: "JSON is wrapped for the security-server hop; response is unwrapped to a flat consumer contract.",
    },
  },
  {
    id: "r-civic-restriction",
    appId: "app-civic",
    path: "/civic/restriction-check",
    method: "POST",
    transform: "rest_to_security_server",
    summary: "Restriction check with normalized JSON response",
    hidesUpstreamCreds: true,
    apisixPath: "/gateway/civic/restriction-check",
    status: "active",
    transformSpec: {
      enabled: true,
      direction: "request",
      kind: "rest_to_security_server",
      variables: [
        { name: "documentNumber", description: "ID number", required: true },
      ],
      template: `{
  "service": "RestrictionCheck",
  "payload": { "documentNumber": "{{documentNumber}}" }
}`,
      notes: "Same hop pattern as person lookup; only the service name and fields differ.",
    },
  },
  {
    id: "r-trade-login",
    appId: "app-trade",
    path: "/trade/login",
    method: "POST",
    transform: "token_broker",
    summary: "Service login; client never sends TradeDesk password",
    hidesUpstreamCreds: true,
    apisixPath: "/gateway/trade/login",
    status: "active",
    transformSpec: {
      enabled: true,
      direction: "request",
      kind: "token_broker",
      variables: [],
      template: "",
      notes: "Service-account password stays in the vault. Consumer receives only a gateway-scoped session.",
    },
  },
  {
    id: "r-trade-catalog",
    appId: "app-trade",
    path: "/trade/catalog",
    method: "GET",
    transform: "rest_passthrough",
    summary: "Catalog list with gateway JWT gate",
    hidesUpstreamCreds: true,
    apisixPath: "/gateway/trade/catalog",
    status: "active",
    transformSpec: {
      enabled: false,
      direction: "request",
      kind: "rest_passthrough",
      variables: [],
      template: "",
      notes: "Passthrough after JWT gate. Upstream Authorization is injected server-side.",
    },
  },
  {
    id: "r-trade-validate",
    appId: "app-trade",
    path: "/trade/validate",
    method: "POST",
    transform: "rest_passthrough",
    summary: "Validate trade request payload",
    hidesUpstreamCreds: true,
    apisixPath: "/gateway/trade/validate",
    status: "active",
    transformSpec: {
      enabled: false,
      direction: "request",
      kind: "rest_passthrough",
      variables: [
        { name: "sku", description: "Catalog SKU", required: true },
        { name: "qty", description: "Requested quantity", required: true },
      ],
      template: "",
      notes: "Body forwarded as-is after schema checks at the gateway edge.",
    },
  },
  {
    id: "r-firm-search",
    appId: "app-firm",
    path: "/firm/search",
    method: "GET",
    transform: "rest_passthrough",
    summary: "Company search passthrough",
    hidesUpstreamCreds: false,
    apisixPath: "/gateway/firm/search",
    status: "active",
    transformSpec: {
      enabled: false,
      direction: "request",
      kind: "rest_passthrough",
      variables: [
        { name: "q", description: "Search query", required: true },
      ],
      template: "",
      notes: "Simple REST passthrough. Drift flag on the app means APISIX sync is pending review.",
    },
  },
  {
    id: "r-firm-detail",
    appId: "app-firm",
    path: "/firm/{id}",
    method: "GET",
    transform: "rest_passthrough",
    summary: "Company detail passthrough",
    hidesUpstreamCreds: false,
    apisixPath: "/gateway/firm/{id}",
    status: "active",
    transformSpec: {
      enabled: false,
      direction: "request",
      kind: "rest_passthrough",
      variables: [
        { name: "id", description: "Company id path param", required: true },
      ],
      template: "",
      notes: "Path param rewrite only — no body transform.",
    },
  },
];

export const CAPABILITIES = [
  {
    id: "bridge",
    title: "Solution bridge",
    body: "One public HTTP surface for many upstreams. Consumers call a stable gateway path while protocols and networks stay behind the facade.",
  },
  {
    id: "rest-soap",
    title: "REST ↔ SOAP translation",
    body: "JSON contracts in, SOAP envelopes out (and back). Numeric/type mapping, XSD-friendly payloads, and no client-side XML.",
  },
  {
    id: "creds",
    title: "Credential vaulting",
    body: "Upstream passwords, SOAP identities, and security-server tokens stay in the integrator. Client JWTs are never forwarded upstream.",
  },
  {
    id: "rbac",
    title: "Access control",
    body: "Roles (admin / operator / consumer) plus per-application assignments. Consumers only see routes for apps they are allowed to use.",
  },
  {
    id: "sync",
    title: "Route registry ↔ gateway",
    body: "Admin DB is the source of truth; gateway routes are seeded/reconciled so catalogs and live proxies do not silently drift.",
  },
];

export function soapEnvelopeFromDraft(draft: {
  subject: string;
  dependency: string;
  amount: number;
}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:doc="urn:docketos:filing">
  <soapenv:Header/>
  <soapenv:Body>
    <doc:radicarBorrador>
      <doc:asunto>${escapeXml(draft.subject)}</doc:asunto>
      <doc:dependencia>${escapeXml(draft.dependency)}</doc:dependencia>
      <doc:valor xsi:type="xsd:integer" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${draft.amount}</doc:valor>
      <!-- upstream credentials injected by gateway — never from client JWT -->
    </doc:radicarBorrador>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
