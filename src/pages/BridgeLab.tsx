import { useState, type FormEvent } from "react";
import { api } from "../lib/api";

type Step = {
  label: string;
  detail: string;
  payload: unknown;
};

export function BridgeLab() {
  const [subject, setSubject] = useState("Interop demo filing");
  const [dependency, setDependency] = useState("Records Office");
  const [amount, setAmount] = useState(1500);
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ steps: Step[] }>("/api/bridge/preview", {
        method: "POST",
        body: JSON.stringify({ subject, dependency, amount }),
      });
      setSteps(res.steps);
    } catch (err) {
      setSteps([]);
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-ink">REST → SOAP lab</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Simulate DocketOS filing: the consumer posts JSON; the gateway builds a
          SOAP envelope, injects vaulted upstream identity, and returns normalized
          JSON. Try the consumer account to see RBAC block other apps.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 border border-line bg-white/75 p-5 sm:grid-cols-3"
      >
        <label className="text-sm sm:col-span-2">
          <span className="text-muted">Subject</span>
          <input
            className="mt-1 w-full border border-line bg-canvas px-3 py-2"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="text-muted">Amount (XSD integer)</span>
          <input
            type="number"
            className="mt-1 w-full border border-line bg-canvas px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-muted">Dependency</span>
          <input
            className="mt-1 w-full border border-line bg-canvas px-3 py-2"
            value={dependency}
            onChange={(e) => setDependency(e.target.value)}
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy}
            className="w-full border border-accent bg-accent px-4 py-2.5 text-sm text-canvas disabled:opacity-60"
          >
            {busy ? "Transforming…" : "Run transform preview"}
          </button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="space-y-4">
        {steps.map((step) => (
          <article key={step.label} className="border border-line bg-white/80 p-5">
            <h3 className="font-display text-xl text-ink">{step.label}</h3>
            <p className="mt-1 text-sm text-muted">{step.detail}</p>
            <pre className="mt-4 overflow-x-auto border border-line/70 bg-canvas p-3 font-mono text-[11px] leading-relaxed text-ink">
              {typeof step.payload === "string"
                ? step.payload
                : JSON.stringify(step.payload, null, 2)}
            </pre>
          </article>
        ))}
      </div>
    </div>
  );
}
