import type { GatewayRoute } from "../mock/db";

const transformLabel: Record<GatewayRoute["transform"], string> = {
  rest_to_soap: "REST → SOAP",
  rest_passthrough: "REST passthrough",
  rest_to_security_server: "REST → security server",
  token_broker: "Token broker",
};

type Props = {
  route: GatewayRoute;
  onClose: () => void;
};

export function RouteTransformPanel({ route, onClose }: Props) {
  const spec = route.transformSpec;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-ink/40 p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close transform panel"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-hidden border border-line bg-white shadow-2xl sm:rounded-lg">
        <header className="flex items-start justify-between gap-3 border-b border-line bg-[#5e35b1] px-5 py-4 text-white">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/70">
              Route transform
            </p>
            <h3 className="mt-1 font-display text-xl">
              {route.method} {route.path}
            </h3>
            <p className="mt-1 font-mono text-xs text-white/80">{route.apisixPath}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-white/40 px-2.5 py-1 text-sm hover:bg-white/10"
          >
            Close
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] ${
                spec.enabled
                  ? "bg-purple-100 text-purple-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {spec.enabled ? "Transform on" : "Transform off"}
            </span>
            <span className="rounded-full bg-teal-50 px-2.5 py-0.5 font-mono text-[11px] text-teal-800">
              {transformLabel[route.transform]}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] text-slate-600">
              {spec.direction === "request" ? "Request" : "Response"}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-muted">{spec.notes}</p>

          <section>
            <h4 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              Variables
            </h4>
            {spec.variables.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                No mapped variables — token broker or pure passthrough.
              </p>
            ) : (
              <div className="mt-2 overflow-x-auto border border-line">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spec.variables.map((v) => (
                      <tr key={v.name} className="border-t border-line/70">
                        <td className="px-3 py-2 font-mono text-xs text-accent">
                          {`{{${v.name}}}`}
                        </td>
                        <td className="px-3 py-2 text-muted">{v.description}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {v.required ? "yes" : "no"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h4 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              {route.transform === "rest_to_soap"
                ? "SOAP template"
                : route.transform === "rest_to_security_server"
                  ? "Hop payload template"
                  : "Template"}
            </h4>
            {spec.template ? (
              <pre className="mt-2 max-h-72 overflow-auto border border-line bg-[#0f1720] p-3 font-mono text-[11px] leading-relaxed text-[#d4e8ea]">
                {spec.template}
              </pre>
            ) : (
              <p className="mt-2 text-sm text-muted">
                No XML/JSON template — behavior is vaulted auth or passthrough.
              </p>
            )}
          </section>

          <section className="border border-line bg-soft/60 p-4">
            <h4 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              Security
            </h4>
            <p className="mt-2 text-sm text-muted">
              {route.hidesUpstreamCreds
                ? "Upstream credentials stay vaulted. Consumer JWT is never forwarded."
                : "Passthrough auth — consumer may present upstream-compatible credentials."}
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}
