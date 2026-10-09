import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Shell } from "./layout/Shell";
import { Access } from "./pages/Access";
import { Applications } from "./pages/Applications";
import { BridgeLab } from "./pages/BridgeLab";
import { Login } from "./pages/Login";
import { Overview } from "./pages/Overview";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Loading demo…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Protected>
              <Shell />
            </Protected>
          }
        >
          <Route index element={<Overview />} />
          <Route path="applications" element={<Applications />} />
          <Route path="bridge" element={<BridgeLab />} />
          <Route path="access" element={<Access />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
