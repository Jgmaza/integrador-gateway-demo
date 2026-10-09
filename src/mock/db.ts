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
  upstreamProtocol: string;
  status: "synced" | "drift";
  routeCount: number;
};

export type GatewayRoute = {
  id: string;
  appId: string;
  path: string;
  method: "GET" | "POST" | "PUT";
  transform: TransformKind;
  summary: string;
  hidesUpstreamCreds: boolean;
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
    upstreamProtocol: "SOAP 1.1 / XML",
    status: "synced",
    routeCount: 4,
  },
  {
    id: "app-civic",
    name: "CivicHub",
    code: "CIVIC",
    description:
      "Civil registry queries behind a security-server style hop. Gateway brokers the token and normalizes the payload.",
    authType: "xroad",
    upstreamProtocol: "Security server / REST",
    status: "synced",
    routeCount: 3,
  },
  {
    id: "app-trade",
    name: "TradeDesk",
    code: "TRADE",
    description:
      "External trade catalog with service-account login. Gateway performs token broker and never returns upstream secrets to clients.",
    authType: "service_login",
    upstreamProtocol: "REST + service login",
    status: "synced",
    routeCount: 5,
  },
  {
    id: "app-firm",
    name: "FirmBook",
    code: "FIRM",
    description:
      "Company directory REST API. Mostly passthrough with JWT-gated access and assigned-app RBAC.",
    authType: "bearer",
    upstreamProtocol: "REST",
    status: "drift",
    routeCount: 2,
  },
];

export const ROUTES: GatewayRoute[] = [
  {
    id: "r-docket-file",
    appId: "app-docket",
    path: "/docket/file-draft",
    method: "POST",
    transform: "rest_to_soap",
    summary: "JSON draft → SOAP radicarBorrador → JSON ticket",
    hidesUpstreamCreds: true,
  },
  {
    id: "r-docket-attach",
    appId: "app-docket",
    path: "/docket/attach",
    method: "POST",
    transform: "rest_to_soap",
    summary: "Attach file metadata via SOAP anexar",
    hidesUpstreamCreds: true,
  },
  {
    id: "r-docket-status",
    appId: "app-docket",
    path: "/docket/status",
    method: "GET",
    transform: "rest_to_soap",
    summary: "Query filing status with SOAP consultar",
    hidesUpstreamCreds: true,
  },
  {
    id: "r-docket-stage",
    appId: "app-docket",
    path: "/docket/change-stage",
    method: "POST",
    transform: "rest_to_soap",
    summary: "Advance workflow stage through SOAP",
    hidesUpstreamCreds: true,
  },
  {
    id: "r-civic-token",
    appId: "app-civic",
    path: "/civic/token",
    method: "POST",
    transform: "token_broker",
    summary: "Broker security-server token (empty body from client)",
    hidesUpstreamCreds: true,
  },
  {
    id: "r-civic-lookup",
    appId: "app-civic",
    path: "/civic/person-lookup",
    method: "POST",
    transform: "rest_to_security_server",
    summary: "Person lookup via security-server hop",
    hidesUpstreamCreds: true,
  },
  {
    id: "r-civic-restriction",
    appId: "app-civic",
    path: "/civic/restriction-check",
    method: "POST",
    transform: "rest_to_security_server",
    summary: "Restriction check with normalized JSON response",
    hidesUpstreamCreds: true,
  },
  {
    id: "r-trade-login",
    appId: "app-trade",
    path: "/trade/login",
    method: "POST",
    transform: "token_broker",
    summary: "Service login; client never sends TradeDesk password",
    hidesUpstreamCreds: true,
  },
  {
    id: "r-trade-catalog",
    appId: "app-trade",
    path: "/trade/catalog",
    method: "GET",
    transform: "rest_passthrough",
    summary: "Catalog list with gateway JWT gate",
    hidesUpstreamCreds: true,
  },
  {
    id: "r-trade-validate",
    appId: "app-trade",
    path: "/trade/validate",
    method: "POST",
    transform: "rest_passthrough",
    summary: "Validate trade request payload",
    hidesUpstreamCreds: true,
  },
  {
    id: "r-firm-search",
    appId: "app-firm",
    path: "/firm/search",
    method: "GET",
    transform: "rest_passthrough",
    summary: "Company search passthrough",
    hidesUpstreamCreds: false,
  },
  {
    id: "r-firm-detail",
    appId: "app-firm",
    path: "/firm/{id}",
    method: "GET",
    transform: "rest_passthrough",
    summary: "Company detail passthrough",
    hidesUpstreamCreds: false,
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
