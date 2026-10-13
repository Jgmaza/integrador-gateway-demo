import { useEffect, useMemo, useState } from "react";
import { RouteTransformPanel } from "../components/RouteTransformPanel";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import type { GatewayApp, GatewayRoute } from "../mock/db";

const transformLabel: Record<GatewayRoute["transform"], string> = {
  rest_to_soap: "REST → SOAP",
  rest_passthrough: "Passthrough",
  rest_to_security_server: "Security server",
  token_broker: "Token broker",
};

const callTypeColor: Record<string, string> = {
  SOAP: "bg-amber-50 text-amber-800 border-amber-200",
  REST: "bg-sky-50 text-sky-800 border-sky-200",
};

export function Applications() {
  const { user } = useAuth();
  const readOnly = user?.role === "consumer";
  const [apps, setApps] = useState<GatewayApp[]>([]);
  const [routes, setRoutes] = useState<GatewayRoute[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [routesAppId, setRoutesAppId] = useState<string | null>(null);
  const [transformRouteId, setTransformRouteId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<GatewayApp[]>("/api/applications"),
      api<GatewayRoute[]>("/api/routes"),
    ])
      .then(([a, r]) => {
        setApps(a);
        setRoutes(r);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error"));
  }, []);

  const filteredApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        app.code.toLowerCase().includes(q) ||
        app.entityLabel.toLowerCase().includes(q) ||
        app.urlDomain.toLowerCase().includes(q),
    );
  }, [apps, search]);

  const routesApp = apps.find((a) => a.id === routesAppId) ?? null;
  const appRoutes = useMemo(
    () => routes.filter((r) => r.appId === routesAppId),
    [routes, routesAppId],
  );
  const transformRoute =
    routes.find((r) => r.id === transformRouteId) ?? null;

  if (error) return <p className="text-red-700">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-line bg-white/90 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5e35b1] text-white">
            <span className="font-mono text-sm">A</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl text-ink">
              {readOnly ? "My applications" : "Application management"}
            </h2>
            <p className="text-sm text-muted">
              Catalog of integrations, gateway routes, and route transforms —
              filtered by your role.
            </p>
          </div>
        </div>

        {readOnly ? (
          <div className="mx-5 mt-4 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
            Read-only view: you can inspect assigned applications and their
            gateway routes.
          </div>
        ) : null}

        <div className="px-5 py-4">
          <label className="block max-w-md">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, code, entity, domain…"
              className="mt-1 w-full border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-y border-line bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3">Application</th>
                <th className="px-3 py-3">Code</th>
                <th className="px-3 py-3">Call type</th>
                <th className="px-3 py-3">Entity</th>
                <th className="px-3 py-3">Auth</th>
                <th className="px-3 py-3">Routes</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((app) => (
                <tr key={app.id} className="border-b border-line/70 hover:bg-soft/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5e35b1]/15 text-[#5e35b1]">
                        <span className="font-mono text-[10px]">{app.code.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-ink">{app.name}</p>
                        <p className="font-mono text-[11px] text-muted">
                          {app.urlDomain}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                      #{app.code}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${
                        callTypeColor[app.callType] ?? "border-line text-muted"
                      }`}
                    >
                      {app.callType}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted">{app.entityLabel}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-muted">
                    {app.authType}
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px]">
                    {app.routeCount}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                        app.status === "synced"
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setRoutesAppId(app.id)}
                      className="border border-[#5e35b1]/30 px-2.5 py-1 font-mono text-[11px] text-[#5e35b1] hover:bg-[#5e35b1]/10"
                    >
                      Gateway routes
                    </button>
                  </td>
                </tr>
              ))}
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-muted">
                    No applications match this search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {routesApp ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close routes dialog"
            onClick={() => setRoutesAppId(null)}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg border border-line bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-3 border-b border-line bg-[#5e35b1] px-5 py-4 text-white">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/70">
                  Gateway routes
                </p>
                <h3 className="mt-1 font-display text-2xl">{routesApp.name}</h3>
                <p className="mt-1 text-sm text-white/85">
                  {routesApp.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRoutesAppId(null)}
                className="border border-white/40 px-2.5 py-1 text-sm hover:bg-white/10"
              >
                Close
              </button>
            </header>

            <div className="overflow-y-auto p-5">
              <div className="mb-4 flex flex-wrap gap-3 font-mono text-[11px] text-muted">
                <span>Upstream: {routesApp.upstreamProtocol}</span>
                <span>·</span>
                <span>Auth: {routesApp.authType}</span>
                <span>·</span>
                <span>{routesApp.userCount} assigned users</span>
              </div>

              <div className="overflow-x-auto border border-line">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-3 py-2">Method</th>
                      <th className="px-3 py-2">Consumer path</th>
                      <th className="px-3 py-2">APISIX path</th>
                      <th className="px-3 py-2">Transform</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appRoutes.map((route) => (
                      <tr key={route.id} className="border-t border-line/70">
                        <td className="px-3 py-2.5 font-mono text-xs">
                          {route.method}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">
                          {route.path}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-muted">
                          {route.apisixPath}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="border border-accent/30 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                            {transformLabel[route.transform]}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                              route.status === "active"
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {route.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => setTransformRouteId(route.id)}
                            className="font-mono text-[11px] text-[#5e35b1] hover:underline"
                          >
                            View transform
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-xs text-muted">
                Demo data only — fictional domains and templates. No institutional
                hosts or credentials.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {transformRoute ? (
        <RouteTransformPanel
          route={transformRoute}
          onClose={() => setTransformRouteId(null)}
        />
      ) : null}
    </div>
  );
}
