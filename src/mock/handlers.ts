import { http, HttpResponse } from "msw";
import {
  APPS,
  CAPABILITIES,
  DEMO_USERS,
  ROUTES,
  soapEnvelopeFromDraft,
  type Role,
} from "./db";

type Session = {
  token: string;
  userId: string;
  role: Role;
  appIds: string[];
  name: string;
  email: string;
};

const sessions = new Map<string, Session>();

function auth(request: Request): Session | null {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return sessions.get(header.slice(7)) ?? null;
}

export const handlers = [
  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    const user = DEMO_USERS.find(
      (u) => u.email === body.email && u.password === body.password,
    );
    if (!user) {
      return HttpResponse.json(
        { detail: "Invalid credentials (demo users only)." },
        { status: 401 },
      );
    }
    const token = `demo.${user.id}.${crypto.randomUUID()}`;
    const session: Session = {
      token,
      userId: user.id,
      role: user.role,
      appIds: user.appIds,
      name: user.name,
      email: user.email,
    };
    sessions.set(token, session);
    return HttpResponse.json({
      access_token: token,
      token_type: "bearer",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        appIds: user.appIds,
      },
    });
  }),

  http.get("/api/me", ({ request }) => {
    const session = auth(request);
    if (!session) {
      return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }
    return HttpResponse.json({
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
      appIds: session.appIds,
    });
  }),

  http.get("/api/capabilities", () => HttpResponse.json(CAPABILITIES)),

  http.get("/api/applications", ({ request }) => {
    const session = auth(request);
    if (!session) {
      return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }
    const apps =
      session.role === "admin"
        ? APPS
        : APPS.filter((app) => session.appIds.includes(app.id));
    return HttpResponse.json(apps);
  }),

  http.get("/api/routes", ({ request }) => {
    const session = auth(request);
    if (!session) {
      return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }
    const allowed =
      session.role === "admin"
        ? ROUTES
        : ROUTES.filter((route) => session.appIds.includes(route.appId));
    return HttpResponse.json(allowed);
  }),

  http.get("/api/users", ({ request }) => {
    const session = auth(request);
    if (!session) {
      return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }
    if (session.role === "consumer") {
      return HttpResponse.json(
        { detail: "Consumers cannot list users." },
        { status: 403 },
      );
    }
    return HttpResponse.json(
      DEMO_USERS.map(({ password: _password, ...safe }) => safe),
    );
  }),

  http.post("/api/bridge/preview", async ({ request }) => {
    const session = auth(request);
    if (!session) {
      return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }
    if (!session.appIds.includes("app-docket") && session.role !== "admin") {
      return HttpResponse.json(
        { detail: "No access to DocketOS routes." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      subject?: string;
      dependency?: string;
      amount?: number;
    };

    const draft = {
      subject: body.subject?.trim() || "Demo filing",
      dependency: body.dependency?.trim() || "Interop Office",
      amount: Number.isFinite(body.amount) ? Number(body.amount) : 0,
    };

    const soap = soapEnvelopeFromDraft(draft);
    const ticket = `DKT-${Math.floor(100000 + Math.random() * 900000)}`;

    return HttpResponse.json({
      steps: [
        {
          label: "1. Consumer REST",
          detail: "Client sends JSON + Integrator JWT to the public gateway.",
          payload: {
            method: "POST",
            path: "/docket/file-draft",
            headers: {
              Authorization: "Bearer <integrator-jwt>",
              "Content-Type": "application/json",
            },
            body: draft,
          },
        },
        {
          label: "2. Gateway auth gate",
          detail:
            "JWT validated. Upstream DocketOS credentials are loaded server-side — never taken from the client token.",
          payload: {
            auth_type: "soap",
            client_jwt_forwarded: false,
            upstream_identity: "vault://docketos/service-user",
          },
        },
        {
          label: "3. REST → SOAP transform",
          detail:
            "JSON fields mapped into SOAP body. Integers typed for XSD. Envelope built by transform executor.",
          payload: soap,
        },
        {
          label: "4. Normalized REST response",
          detail: "SOAP response parsed back to JSON for the consumer.",
          payload: {
            ok: true,
            ticket,
            status: "DRAFT_FILED",
            dependency: draft.dependency,
            message: "Mock SOAP acknowledgement translated to JSON.",
          },
        },
      ],
    });
  }),
];
