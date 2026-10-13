import { http, HttpResponse } from "msw";
import {
  APPLICATIONS,
  CONNECTION_TYPES,
  DEMO_ROLE,
  DEMO_USER,
  ENTITIES,
  SECURITY_TYPES,
  USERS,
  wrapList,
  wrapOne,
} from "./data";

const apps = structuredClone(APPLICATIONS);

export const handlers = [
  http.post("/api/v1/auth/login", async () =>
    HttpResponse.json(
      wrapOne({ access_token: "demo-token", token_type: "Bearer" }),
    ),
  ),

  http.get("/api/v1/users/me", () => HttpResponse.json(wrapOne(DEMO_USER))),

  http.get("/api/v1/roles/:id", () => HttpResponse.json(wrapOne(DEMO_ROLE))),

  http.get("/api/v1/users", () => HttpResponse.json(wrapList(USERS))),

  http.get("/api/v1/entities", () => HttpResponse.json(wrapList(ENTITIES))),

  http.get("/api/v1/security-types", () =>
    HttpResponse.json(wrapList(SECURITY_TYPES)),
  ),

  http.get("/api/v1/connection-types", () =>
    HttpResponse.json(wrapList(CONNECTION_TYPES)),
  ),

  http.get("/api/v1/applications", () => {
    const list = apps.map(({ rutas: _rutas, ...rest }) => rest);
    return HttpResponse.json(wrapList(list));
  }),

  http.get("/api/v1/applications/:id/rutas", ({ params }) => {
    const id = Number(params.id);
    const app = apps.find((a) => a.id === id);
    return HttpResponse.json(wrapList(app?.rutas ?? []));
  }),

  http.get("/api/v1/applications/:id", ({ params }) => {
    const id = Number(params.id);
    const app = apps.find((a) => a.id === id);
    if (!app) {
      return HttpResponse.json(
        {
          resultCode: "NOT_FOUND",
          message: "Not found",
          errorDescription: "Application not found",
          resultObj: null,
          systemTime: Date.now(),
        },
        { status: 404 },
      );
    }
    return HttpResponse.json(wrapOne(app));
  }),

  http.post("/api/v1/applications/transform/preview", async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    return HttpResponse.json(
      wrapOne({
        ok: true,
        note: "Mock preview — no upstream call",
        request: body,
        soap_preview:
          '<?xml version="1.0"?><Envelope><Body><!-- mock --></Body></Envelope>',
      }),
    );
  }),

  // Soft-success mutations so the real UI keeps working without a backend
  http.post("/api/v1/applications", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const created = {
      id: Math.max(...apps.map((a) => a.id)) + 1,
      name: String(body.name ?? "New app"),
      url_domain: String(body.url_domain ?? "new.demo.internal"),
      entity_id: (body.entity_id as number) ?? null,
      call_type: String(body.call_type ?? "REST"),
      security_type_id: (body.security_type_id as number) ?? null,
      connection_types_id: (body.connection_types_id as number) ?? null,
      users: [],
      auth_type: "none",
      auth_config: {},
      headers_globales: {},
      rutas: Array.isArray(body.rutas) ? body.rutas : [],
    };
    apps.push(created as (typeof apps)[number]);
    return HttpResponse.json(wrapOne(created));
  }),

  http.put("/api/v1/applications/:id", async ({ params, request }) => {
    const id = Number(params.id);
    const idx = apps.findIndex((a) => a.id === id);
    if (idx < 0) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    apps[idx] = { ...apps[idx], ...body, id } as (typeof apps)[number];
    return HttpResponse.json(wrapOne(apps[idx]));
  }),

  http.patch("/api/v1/applications/:id", async ({ params, request }) => {
    const id = Number(params.id);
    const idx = apps.findIndex((a) => a.id === id);
    if (idx < 0) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    apps[idx] = { ...apps[idx], ...body, id } as (typeof apps)[number];
    return HttpResponse.json(wrapOne(apps[idx]));
  }),

  http.delete("/api/v1/applications/:id", ({ params }) => {
    const id = Number(params.id);
    const idx = apps.findIndex((a) => a.id === id);
    if (idx >= 0) apps.splice(idx, 1);
    return HttpResponse.json(wrapOne({ deleted: true }));
  }),
];
