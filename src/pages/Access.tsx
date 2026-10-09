import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { APPS, type Role } from "../mock/db";

type SafeUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  appIds: string[];
};

export function Access() {
  const { user } = useAuth();
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<SafeUser[]>("/api/users")
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : "Error"));
  }, []);

  const appName = (id: string) => APPS.find((a) => a.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-ink">Access control</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Two layers: role (what console screens you can manage) and application
          assignment (which gateway families you may call). Consumers are blocked
          from user administration.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            role: "admin",
            text: "Full catalog, user list, reconcile mindset.",
          },
          {
            role: "operator",
            text: "Operate assigned apps; can list users.",
          },
          {
            role: "consumer",
            text: "Call assigned gateway routes only; no user admin.",
          },
        ].map((item) => (
          <article key={item.role} className="border border-line bg-white/75 p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-accent">
              {item.role}
            </p>
            <p className="mt-2 text-sm text-muted">{item.text}</p>
          </article>
        ))}
      </section>

      <section className="border border-line bg-white/75 p-5">
        <h3 className="font-display text-xl">Your session</h3>
        <p className="mt-2 font-mono text-sm text-muted">
          {user?.email} · {user?.role}
        </p>
        <p className="mt-2 text-sm text-muted">
          Assigned apps:{" "}
          {user?.appIds.map(appName).join(", ") || "none"}
        </p>
      </section>

      {error ? (
        <div className="border border-amber-700/30 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">RBAC mock response</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-muted">
            Switch to admin@ or ops@ to list users. This is the access-control
            story, not a bug.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-line bg-white/75">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line font-mono text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Apps</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line/60">
                  <td className="px-4 py-3">
                    <p className="text-ink">{u.name}</p>
                    <p className="font-mono text-xs text-muted">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs uppercase">
                    {u.role}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {u.appIds.map(appName).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
