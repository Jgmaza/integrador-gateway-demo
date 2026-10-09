import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { GatewayApp, GatewayRoute } from "../mock/db";

const transformLabel: Record<GatewayRoute["transform"], string> = {
  rest_to_soap: "REST → SOAP",
  rest_passthrough: "REST passthrough",
  rest_to_security_server: "REST → security server",
  token_broker: "Token broker",
};

export function Applications() {
  const [apps, setApps] = useState<GatewayApp[]>([]);
  const [routes, setRoutes] = useState<GatewayRoute[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<GatewayApp[]>("/api/applications"),
      api<GatewayRoute[]>("/api/routes"),
    ])
      .then(([a, r]) => {
        setApps(a);
        setRoutes(r);
        setSelected(a[0]?.id ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error"));
  }, []);

  const visibleRoutes = useMemo(
    () => routes.filter((r) => r.appId === selected),
    [routes, selected],
  );

  const current = apps.find((a) => a.id === selected);

  if (error) return <p className="text-red-700">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-ink">Applications & routes</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Catalog filtered by your role and assigned apps. Each route declares how
          the bridge behaves and whether upstream credentials stay vaulted.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {apps.map((app) => (
          <button
            key={app.id}
            type="button"
            onClick={() => setSelected(app.id)}
            className={`border p-4 text-left ${
              selected === app.id
                ? "border-accent bg-soft"
                : "border-line bg-white/70 hover:border-accent/50"
            }`}
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
              {app.code}
            </p>
            <p className="mt-1 font-display text-lg">{app.name}</p>
            <p className="mt-2 font-mono text-[11px] text-muted">
              {app.authType} · {app.routeCount} routes · {app.status}
            </p>
          </button>
        ))}
      </div>

      {current ? (
        <section className="border border-line bg-white/75 p-5">
          <h3 className="font-display text-2xl">{current.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {current.description}
          </p>
          <p className="mt-3 font-mono text-xs text-muted">
            Upstream: {current.upstreamProtocol}
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line font-mono text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-2 pr-3">Method</th>
                  <th className="py-2 pr-3">Path</th>
                  <th className="py-2 pr-3">Transform</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {visibleRoutes.map((route) => (
                  <tr key={route.id} className="border-b border-line/60">
                    <td className="py-3 pr-3 font-mono text-xs">{route.method}</td>
                    <td className="py-3 pr-3 font-mono text-xs">{route.path}</td>
                    <td className="py-3 pr-3">
                      <span className="border border-accent/30 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                        {transformLabel[route.transform]}
                      </span>
                    </td>
                    <td className="py-3 text-muted">
                      {route.summary}
                      {route.hidesUpstreamCreds
                        ? " · creds vaulted"
                        : " · passthrough auth"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
