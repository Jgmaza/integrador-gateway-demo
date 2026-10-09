import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { CAPABILITIES } from "../mock/db";

type Capability = (typeof CAPABILITIES)[number];

export function Overview() {
  const [caps, setCaps] = useState<Capability[]>([]);

  useEffect(() => {
    api<Capability[]>("/api/capabilities").then(setCaps).catch(() => setCaps(CAPABILITIES));
  }, []);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-3xl text-ink">What this gateway solves</h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted">
          Consumers should not speak SOAP, hold upstream passwords, or know which
          VPN/security-server hop sits behind a path. The integrator is the bridge:
          one REST surface, protocol translation, hidden credentials, and access
          control by role and assigned applications.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/bridge"
            className="border border-accent bg-accent px-4 py-2 text-sm text-canvas"
          >
            Open REST → SOAP lab
          </Link>
          <Link
            to="/applications"
            className="border border-line bg-white/70 px-4 py-2 text-sm text-ink"
          >
            Browse apps & routes
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {caps.map((cap) => (
          <article
            key={cap.id}
            className="border border-line bg-white/75 p-5"
          >
            <h3 className="font-display text-xl text-ink">{cap.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{cap.body}</p>
          </article>
        ))}
      </section>

      <section className="border border-line bg-white/60 p-5">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          Request path (conceptual)
        </h3>
        <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed text-ink">{`Consumer app
  → POST /gateway/{family}/{action} + Integrator JWT
  → APISIX auth / rate-limit
  → Transform executor (REST→SOAP | token broker | passthrough)
  → Upstream (SOAP / REST / security server)
  → Normalized JSON back to consumer`}</pre>
      </section>
    </div>
  );
}
